import { useState, useEffect, useMemo } from 'react';
import { parseDecimalToMinor } from '../lib/money';
import { db } from '../db/db';
import { createExpense } from '../db/repositories';
import { generateId } from '../lib/utils';
import { DatePicker } from './ui/DatePicker';
import type { SplitType } from '../domain/types';
import { calculateShares } from '../domain/allocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getTodayISODate } from '../lib/date';

import { toast } from 'sonner';
import { X, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface Props {
  onClose: () => void;
}

export default function AddExpenseModal({ onClose }: Props) {
  const peopleRaw = useLiveQuery(() => db.people.filter(p => !p.deletedAt && !p.archivedAt).toArray());
  const categoriesRaw = useLiveQuery(() => db.categories.filter(c => !c.deletedAt).toArray());
  const people = useMemo(() => peopleRaw || [], [peopleRaw]);
  const categories = useMemo(() => categoriesRaw || [], [categoriesRaw]);
  const settings = useLiveQuery(() => db.settings.get('user_settings'));

  const me = people.find(p => p.isMe);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); // major units string
  const [date, setDate] = useState(() => getTodayISODate());
  const [payerId, setPayerId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [splitType] = useState<SplitType>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (me) s.add(me.id);
    return s;
  });

  const sortedPeople = [...people].sort((a, b) => {
    if (a.isMe) return -1;
    if (b.isMe) return 1;
    return a.name.localeCompare(b.name);
  });

  useEffect(() => {
    if (me && !payerId) {
      setTimeout(() => setPayerId(me.id), 0);
    }
  }, [me, payerId]);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setTimeout(() => setSelectedCategoryId(categories[0].id), 0);
    }
  }, [categories, selectedCategoryId]);

  const toggleParticipant = (id: string) => {
    const next = new Set(selectedParticipants);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedParticipants(next);
  };

  const selectAll = () => setSelectedParticipants(new Set(people.map(p => p.id)));
  
  const handleSave = async (keepOpen = false) => {
    try {
      if (!description.trim()) return toast.error('Description required');
      const amountMinor = parseDecimalToMinor(amount);
      if (isNaN(amountMinor) || amountMinor <= 0) return toast.error('Valid amount required');
      if (selectedParticipants.size === 0) return toast.error('Select at least one participant');
      if (!payerId) return toast.error('Select a payer');

      const participantArr = Array.from(selectedParticipants).map(personId => ({ personId }));
      const shares = calculateShares(amountMinor, splitType, participantArr);
      const participantIds = Array.from(selectedParticipants);
      
      let categoryId = selectedCategoryId || (categories.length > 0 ? categories[0].id : '');
      if (!categoryId) {
        categoryId = generateId();
        await db.categories.add({
          id: categoryId,
          name: 'General',
          icon: 'receipt',
          color: '#3b82f6',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null
        });
      }

      await createExpense({
        id: generateId(),
        groupId: null,
        description,
        amountMinor,
        currency: settings?.defaultCurrency || 'INR',
        date,
        categoryId,
        payers: [{ personId: payerId, amountMinor }], // Single payer for simplicity in UI
        shares,
        participantIds,
        notes: '',
        splitType
      });

      if (keepOpen) {
        toast.success('Expense added! Ready for next transaction.');
        setDescription('');
        setAmount('');
      } else {
        toast.success('Expense added');
        onClose();
      }
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        toast.error(err.message || 'Failed to add expense');
      } else {
        toast.error('Failed to add expense');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-sheet)] flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-lg md:rounded-xl rounded-t-xl h-[90dvh] md:h-auto md:max-h-[90dvh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="text-xl font-bold">Add Expense</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input 
              placeholder="e.g. Dinner at Resthouse" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              autoFocus
              className="text-lg py-6"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2 p-2 border rounded-lg bg-muted/20 max-h-36 overflow-y-auto">
              {categories.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedCategoryId === c.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                      : 'bg-card text-foreground hover:bg-muted border-border'
                  }`}
                >
                  <span className="text-base">{c.icon}</span>
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Amount ({settings?.defaultCurrency || 'INR'})</Label>
              <Input 
                type="number" 
                step="0.01" 
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="text-xl py-6 font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker 
                value={date}
                onChange={setDate}
                className="h-12 text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Who Paid?</Label>
            <div className="flex flex-wrap gap-2">
              {sortedPeople.map(p => (
                <Button 
                  key={p.id}
                  variant={payerId === p.id ? 'default' : 'outline'}
                  onClick={() => setPayerId(p.id)}
                  className="rounded-full"
                >
                  {p.isMe ? 'You' : p.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>For Whom?</Label>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={selectAll}>
                Select All
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sortedPeople.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => toggleParticipant(p.id)}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${selectedParticipants.has(p.id) ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-muted'}`}
                >
                  <div className={`h-4 w-4 rounded-sm border flex items-center justify-center ${selectedParticipants.has(p.id) ? 'bg-primary border-primary text-primary-foreground' : 'border-input'}`}>
                    {selectedParticipants.has(p.id) && <Check className="h-3 w-3" />}
                  </div>
                  <span className="text-sm font-medium">{p.isMe ? 'You' : p.name}</span>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 shrink-0 flex gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => handleSave(true)} 
            className="flex-1 h-12 text-sm sm:text-base font-medium"
          >
            + Add Another
          </Button>
          <Button 
            type="button" 
            onClick={() => handleSave(false)} 
            className="flex-1 h-12 text-sm sm:text-base font-semibold"
          >
            Save Expense
          </Button>
        </div>
      </div>
    </div>
  );
}
