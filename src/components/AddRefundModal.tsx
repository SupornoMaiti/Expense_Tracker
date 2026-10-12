import { useState, useEffect } from 'react';
import type { Expense } from '../domain/types';
import { parseDecimalToMinor, formatMoney } from '../lib/money';
import { createRefundForExpense } from '../db/repositories';
import { DatePicker } from './ui/DatePicker';
import { formatDisplayDate, getTodayISODate } from '../lib/date';
import { db } from '../db/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { X, RotateCcw, AlertCircle } from 'lucide-react';

interface Props {
  expense: Expense;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddRefundModal({ expense, onClose, onSuccess }: Props) {
  const [maxRefundable, setMaxRefundable] = useState<number>(expense.amountMinor);
  const [amount, setAmount] = useState((expense.amountMinor / 100).toString());
  const [date, setDate] = useState(() => getTodayISODate());
  const [notes, setNotes] = useState(`Refund for "${expense.description}"`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadExistingRefunds() {
      const existingRefunds = await db.expenses
        .where('refundOfId')
        .equals(expense.id)
        .filter(e => !e.deletedAt)
        .toArray();
      const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + r.amountMinor, 0);
      const remaining = Math.max(0, expense.amountMinor - alreadyRefunded);
      if (isMounted) {
        setMaxRefundable(remaining);
        setAmount((remaining / 100).toString());
      }
    }
    loadExistingRefunds();
    return () => {
      isMounted = false;
    };
  }, [expense.id, expense.amountMinor]);

  const handleSave = async () => {
    const amountMinor = parseDecimalToMinor(amount);
    if (isNaN(amountMinor) || amountMinor <= 0) {
      toast.error('Please enter a valid positive refund amount');
      return;
    }
    if (amountMinor > maxRefundable) {
      toast.error(`Refund amount cannot exceed remaining ${formatMoney(maxRefundable, expense.currency)}`);
      return;
    }

    try {
      setIsSubmitting(true);
      await createRefundForExpense({
        originalExpenseId: expense.id,
        amountMinor,
        date,
        notes: notes.trim() || undefined,
      });
      toast.success(`Refund of ${formatMoney(amountMinor, expense.currency)} recorded`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to record refund';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/40">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">Record Refund</h2>
              <p className="text-xs text-muted-foreground">Reverse or reimburse an expense</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {/* Original expense summary */}
          <div className="p-3 bg-muted/30 rounded-xl border flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs space-y-0.5 min-w-0">
              <p className="font-medium text-foreground truncate">Original: {expense.description}</p>
              <p className="text-muted-foreground">
                Total {formatMoney(expense.amountMinor, expense.currency)} • Date: {formatDisplayDate(expense.date)}
              </p>
              {maxRefundable < expense.amountMinor && (
                <p className="text-amber-600 dark:text-amber-400 font-medium pt-0.5">
                  Remaining refundable: {formatMoney(maxRefundable, expense.currency)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">Refund Amount</Label>
              <button
                type="button"
                onClick={() => setAmount((maxRefundable / 100).toString())}
                className="text-[11px] text-primary hover:underline font-medium"
                disabled={maxRefundable <= 0}
              >
                Max Refund ({formatMoney(maxRefundable, expense.currency)})
              </button>
            </div>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg font-semibold h-11"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Date</Label>
            <DatePicker
              value={date}
              onChange={setDate}
              className="h-10 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Notes / Reason</Label>
            <Input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Returned item, merchant refund"
              className="h-9 text-sm"
            />
          </div>
        </div>

        <div className="p-4 border-t bg-muted/20 flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="gap-1.5">
            <RotateCcw className="h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Record Refund'}
          </Button>
        </div>
      </div>
    </div>
  );
}
