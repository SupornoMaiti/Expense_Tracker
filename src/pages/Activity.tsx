import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { formatMoney } from '../lib/money';
import { Clock, Users, IndianRupee, MessageCircle, Undo2, Search, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { restoreExpense, softDeleteExpense, softDeleteSettlement, restoreSettlement } from '../db/repositories';
import AddRefundModal from '../components/AddRefundModal';

export default function Activity() {
  const expenses = useLiveQuery(() => db.expenses.toArray());
  const settlements = useLiveQuery(() => db.settlements.toArray());
  const reminders = useLiveQuery(() => db.reminders.toArray());
  const people = useLiveQuery(() => db.people.toArray());
  const settings = useLiveQuery(() => db.settings.get('user_settings'));

  const [filterType, setFilterType] = useState('all');
  const [filterPersonId, setFilterPersonId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedRefundExpense, setSelectedRefundExpense] = useState<any>(null);

  if (!expenses || !settlements || !reminders || !people || !settings) {
    return (
      <div className="flex h-full items-center justify-center p-8 animate-pulse">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Clock className="h-8 w-8" />
          <p>Loading activity...</p>
        </div>
      </div>
    );
  }

  const allItems = [
    ...expenses.map(e => ({ type: 'expense' as const, data: e, time: new Date(e.createdAt).getTime(), dateLabel: new Date(e.createdAt).toLocaleString() })),
    ...settlements.map(s => ({ type: 'settlement' as const, data: s, time: new Date(s.createdAt).getTime(), dateLabel: new Date(s.createdAt).toLocaleString() })),
    ...reminders.map(r => ({ type: 'reminder' as const, data: r, time: new Date(r.sentAt).getTime(), dateLabel: new Date(r.sentAt).toLocaleString() }))
  ].sort((a, b) => b.time - a.time);

  const expenseCount = expenses.length;
  const settlementCount = settlements.length;
  const reminderCount = reminders.length;
  const totalCount = allItems.length;

  let activityItems = allItems;

  if (filterType !== 'all') {
    activityItems = activityItems.filter(a => a.type === filterType);
  }

  if (filterPersonId !== 'all') {
    activityItems = activityItems.filter(a => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = a.data as any;
      if (a.type === 'expense') return d.participantIds.includes(filterPersonId);
      if (a.type === 'settlement') return d.fromId === filterPersonId || d.toId === filterPersonId;
      if (a.type === 'reminder') return d.personId === filterPersonId;
      return false;
    });
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    activityItems = activityItems.filter(a => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = a.data as any;
      if (a.type === 'expense') {
        const pNames = (d.participantIds || []).map((id: string) => people.find(p => p.id === id)?.name || '').join(' ');
        return (d.description || '').toLowerCase().includes(q) || (d.notes || '').toLowerCase().includes(q) || pNames.toLowerCase().includes(q);
      }
      if (a.type === 'settlement') {
        const fromName = people.find(p => p.id === d.fromId)?.name || '';
        const toName = people.find(p => p.id === d.toId)?.name || '';
        return fromName.toLowerCase().includes(q) || toName.toLowerCase().includes(q) || (d.notes || '').toLowerCase().includes(q);
      }
      if (a.type === 'reminder') {
        const pName = people.find(p => p.id === d.personId)?.name || '';
        return pName.toLowerCase().includes(q) || (d.messageSnapshot || '').toLowerCase().includes(q);
      }
      return false;
    });
  }

  const handleUndo = async (id: string) => {
    try {
      await restoreExpense(id);
      toast.success('Expense restored');
    } catch {
      toast.error('Failed to restore expense');
    }
  };

  const handleRestoreSettlement = async (id: string) => {
    try {
      await restoreSettlement(id);
      toast.success('Payment restored');
    } catch {
      toast.error('Failed to restore payment');
    }
  };

  const handleDelete = async (type: 'expense' | 'settlement', id: string, name: string) => {
    try {
      if (type === 'expense') {
        const result = await softDeleteExpense(id);
        const msg = result.deletedRefundCount > 0
          ? `Deleted "${name}" and ${result.deletedRefundCount} linked refund${result.deletedRefundCount > 1 ? 's' : ''}`
          : `Deleted "${name}"`;
        toast.success(msg, {
          action: {
            label: 'Undo',
            onClick: () => restoreExpense(id),
          },
        });
      } else {
        const result = await softDeleteSettlement(id);
        const msg = result.deletedRefundCount > 0
          ? `Deleted payment and ${result.deletedRefundCount} linked refund${result.deletedRefundCount > 1 ? 's' : ''}`
          : 'Deleted payment';
        toast.success(msg, {
          action: {
            label: 'Undo',
            onClick: () => restoreSettlement(id),
          },
        });
      }
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-muted-foreground">Chronological feed of everything that happened</p>
      </div>

      {/* Type quick-filter pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Types', count: totalCount },
          { id: 'expense', label: 'Expenses', count: expenseCount },
          { id: 'settlement', label: 'Settlements', count: settlementCount },
          { id: 'reminder', label: 'Reminders', count: reminderCount },
        ].map(t => (
          <Button
            key={t.id}
            variant={filterType === t.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType(t.id)}
            className="rounded-full text-xs font-medium"
          >
            {t.label} <span className="ml-1.5 opacity-70 text-[11px] font-semibold">({t.count})</span>
          </Button>
        ))}
      </div>

      {/* Search and Person filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activity by name or note..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterPersonId} onValueChange={(v) => v && setFilterPersonId(v)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All people" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All people</SelectItem>
            {people.filter(p => !p.isMe).map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {activityItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-xl border border-dashed">
            <Clock className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">No activity found</h3>
          </div>
        ) : (
          activityItems.map((item) => {
            if (item.type === 'reminder') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const reminder = item.data as any;
              const person = people.find(p => p.id === reminder.personId);
              return (
                <div key={reminder.id} className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">Reminder sent to {person?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{item.dateLabel}</p>
                    </div>
                  </div>
                </div>
              );
            }

            if (item.type === 'settlement') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const settlement = item.data as any;
              const fromPerson = people.find(p => p.id === settlement.fromId);
              const toPerson = people.find(p => p.id === settlement.toId);
              const isDeleted = !!settlement.deletedAt;

              return (
                <div key={settlement.id} className={`flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm ${isDeleted ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4 min-w-0 flex-1 mr-3">
                    <div className="p-2 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 shrink-0">
                      <IndianRupee className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${isDeleted ? 'line-through text-muted-foreground' : ''}`}>
                        {fromPerson?.name || 'Unknown'} paid {toPerson?.name || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.dateLabel} {isDeleted ? '(Deleted)' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="font-semibold text-right">
                      {formatMoney(settlement.amountMinor, settlement.currency)}
                    </div>
                    {isDeleted ? (
                      <Button variant="outline" size="sm" onClick={() => handleRestoreSettlement(settlement.id)} className="h-8 text-xs">
                        <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete('settlement', settlement.id, 'Payment')}
                        title="Delete payment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            }

            if (item.type === 'expense') {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const expense = item.data as any;
              const isSoftDeleted = !!expense.deletedAt;
              const isRefundItem = !!expense.isRefund || !!expense.refundOfId;

              return (
                <div key={expense.id} className={`flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm ${isSoftDeleted ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4 min-w-0 flex-1 mr-3">
                    <div className={`p-2 rounded-full shrink-0 ${isRefundItem ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30'}`}>
                      {isRefundItem ? <RotateCcw className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`font-medium truncate ${isSoftDeleted ? 'line-through text-muted-foreground' : ''}`}>
                          {expense.description}
                        </p>
                        {isRefundItem && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            Refund
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.dateLabel} {isSoftDeleted ? '(Deleted)' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="font-semibold text-right">
                      {formatMoney(expense.amountMinor, expense.currency)}
                    </div>
                    {isSoftDeleted ? (
                      <Button variant="outline" size="sm" onClick={() => handleUndo(expense.id)} className="h-8 text-xs">
                        <Undo2 className="h-3.5 w-3.5 mr-1" /> Undo
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        {!isRefundItem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            onClick={() => setSelectedRefundExpense(expense)}
                            title="Record refund for this expense"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete('expense', expense.id, expense.description)}
                          title="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
      </div>

      {selectedRefundExpense && (
        <AddRefundModal
          expense={selectedRefundExpense}
          onClose={() => setSelectedRefundExpense(null)}
        />
      )}
    </div>
  );
}
