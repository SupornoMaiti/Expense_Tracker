import { useState, useEffect } from 'react';
import { db } from '../db/db';
import { createExpense } from '../db/repositories';
import type { SplitType } from '../domain/types';
import { calculateShares } from '../domain/allocation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { toast } from 'sonner';
import { X, Check } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface Props {
  onClose: () => void;
}

export default function AddExpenseModal({ onClose }: Props) {
  const people = useLiveQuery(() => db.people.filter(p => !p.deletedAt && !p.archivedAt).toArray()) || [];
  const categories = useLiveQuery(() => db.categories.filter(c => !c.deletedAt).toArray()) || [];
  const settings = useLiveQuery(() => db.settings.get('user_settings'));

  const me = people.find(p => p.isMe);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(''); // major units string
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getFullYear()}`;
  });
  const [payerId, setPayerId] = useState<string>('');
  const [splitType] = useState<SplitType>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (me && !payerId) {
      setTimeout(() => setPayerId(me.id), 0);
    }
  }, [me, payerId]);

  const toggleParticipant = (id: string) => {
    const next = new Set(selectedParticipants);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedParticipants(next);
  };

  const selectAll = () => setSelectedParticipants(new Set(people.map(p => p.id)));
  
  const handleSave = async () => {
    try {
      if (!description.trim()) return toast.error('Description required');
      const amountMinor = Math.round(parseFloat(amount) * 100);
      if (isNaN(amountMinor) || amountMinor <= 0) return toast.error('Valid amount required');
      if (selectedParticipants.size === 0) return toast.error('Select at least one participant');
      if (!payerId) return toast.error('Select a payer');

      const participantArr = Array.from(selectedParticipants).map(personId => ({ personId }));
      const shares = calculateShares(amountMinor, splitType, participantArr);
      const participantIds = Array.from(selectedParticipants);
      
      // Pick the first category as default for now if none exists
      // Wait, we need categories seeded.
      let categoryId = categories.length > 0 ? categories[0].id : '';
      if (!categoryId) {
        categoryId = crypto.randomUUID();
        await db.categories.add({
          id: categoryId,
          name: 'General',
          icon: 'receipt',
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null
        });
      }

      await createExpense({
        id: crypto.randomUUID(),
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

      toast.success('Expense added');
      onClose();
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4 animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-lg md:rounded-xl rounded-t-xl h-[90vh] md:h-auto md:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-4 duration-300">
        
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
              <Label>Date (DD-MM-YYYY)</Label>
              <Input 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="text-lg py-6"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Who Paid?</Label>
            <div className="flex flex-wrap gap-2">
              {people.map(p => (
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
              {people.map(p => (
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
        <div className="p-4 border-t bg-muted/20 shrink-0">
          <Button onClick={handleSave} className="w-full h-12 text-lg">
            Save Expense
          </Button>
        </div>
      </div>
    </div>
  );
}
