import { useState } from 'react';
import type { Person, Expense, Settlement } from '../../domain/types';
import { formatMoney } from '../../lib/money';
import { formatDisplayDate } from '../../lib/date';
import { getExpensePairwiseImpact } from '../../domain/ledger';
import { softDeleteExpense, softDeleteSettlement, restoreExpense, restoreSettlement } from '../../db/repositories';
import { Button } from '@/components/ui/button';
import { Clock, RotateCcw, Users, Trash2 } from 'lucide-react';
import CurrencyIcon from '@/components/ui/CurrencyIcon';
import { toast } from 'sonner';

interface PersonActivityFeedProps {
  person: Person;
  myId: string;
  allPeople: Person[];
  currency: string;
  sharedExpenses: Expense[];
  sharedSettlements: Settlement[];
  onSelectRefundExpense: (expense: Expense) => void;
}

export function PersonActivityFeed({
  person,
  myId,
  allPeople,
  currency,
  sharedExpenses,
  sharedSettlements,
  onSelectRefundExpense,
}: PersonActivityFeedProps) {
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'settlement'>('all');

  const friendId = person.id;

  const activity = [...sharedExpenses, ...sharedSettlements].sort((a, b) => {
    const dateA = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '');
    const dateB = b.date || (b.createdAt ? b.createdAt.split('T')[0] : '');
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const filteredActivity = activity.filter((item) => {
    if (typeFilter === 'expense') return 'description' in item;
    if (typeFilter === 'settlement') return !('description' in item);
    return true;
  });

  const handleDeleteItem = async (item: Expense | Settlement) => {
    const isExpense = 'description' in item;
    const title = isExpense ? (item as Expense).description : 'Payment';
    try {
      if (isExpense) {
        const result = await softDeleteExpense(item.id);
        const msg =
          result.deletedRefundCount > 0
            ? `Deleted "${title}" and ${result.deletedRefundCount} linked refund${
                result.deletedRefundCount > 1 ? 's' : ''
              }`
            : `Deleted "${title}"`;
        toast.success(msg, {
          action: { label: 'Undo', onClick: () => restoreExpense(item.id) },
        });
      } else {
        const result = await softDeleteSettlement(item.id);
        const msg =
          result.deletedRefundCount > 0
            ? `Deleted payment and ${result.deletedRefundCount} linked refund${
                result.deletedRefundCount > 1 ? 's' : ''
              }`
            : 'Deleted payment';
        toast.success(msg, {
          action: { label: 'Undo', onClick: () => restoreSettlement(item.id) },
        });
      }
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Activity with {person.name}</h2>
        <div className="flex gap-2">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className="rounded-full text-xs h-7"
          >
            All ({activity.length})
          </Button>
          <Button
            variant={typeFilter === 'expense' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('expense')}
            className="rounded-full text-xs h-7"
          >
            Expenses ({sharedExpenses.length})
          </Button>
          <Button
            variant={typeFilter === 'settlement' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('settlement')}
            className="rounded-full text-xs h-7"
          >
            Settlements ({sharedSettlements.length})
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-xl border border-dashed">
            <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">No activity found</p>
          </div>
        ) : (
          filteredActivity.map((item) => {
            const isExpense = 'description' in item;

            if (isExpense) {
              const expense = item as Expense;
              const isRefundItem = !!expense.isRefund || !!expense.refundOfId;
              const pairwiseImpact = getExpensePairwiseImpact(expense, myId, friendId);

              const myPayment = expense.payers?.find((p) => p.personId === myId)?.amountMinor || 0;
              const friendPayment = expense.payers?.find((p) => p.personId === friendId)?.amountMinor || 0;

              let payerSummary: string;
              if (expense.payers && expense.payers.length === 1) {
                const payerId = expense.payers[0].personId;
                if (payerId === myId) {
                  payerSummary = `You paid ${formatMoney(expense.amountMinor, expense.currency)}`;
                } else if (payerId === friendId) {
                  payerSummary = `${person.name} paid ${formatMoney(expense.amountMinor, expense.currency)}`;
                } else {
                  const otherPayer = allPeople.find((p) => p.id === payerId)?.name || 'Someone';
                  payerSummary = `${otherPayer} paid ${formatMoney(expense.amountMinor, expense.currency)}`;
                }
              } else if (myPayment > 0 && friendPayment === 0) {
                payerSummary = `You paid ${formatMoney(myPayment, expense.currency)}`;
              } else if (friendPayment > 0 && myPayment === 0) {
                payerSummary = `${person.name} paid ${formatMoney(friendPayment, expense.currency)}`;
              } else if (myPayment > 0 && friendPayment > 0) {
                payerSummary = `You paid ${formatMoney(myPayment, expense.currency)}, ${person.name} paid ${formatMoney(
                  friendPayment,
                  expense.currency
                )}`;
              } else {
                payerSummary = `Total ${formatMoney(expense.amountMinor, expense.currency)}`;
              }

              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-xs hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
                    <div
                      className={`p-2.5 rounded-full shrink-0 ${
                        isRefundItem
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40'
                          : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40'
                      }`}
                    >
                      {isRefundItem ? <RotateCcw className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-sm truncate text-foreground">
                          {expense.description}
                        </p>
                        {isRefundItem && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                            Refund
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {payerSummary} • {formatDisplayDate(expense.date)}
                      </p>
                      {expense.notes && (
                        <p className="text-[11px] text-muted-foreground/80 italic mt-0.5 truncate">
                          {expense.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {pairwiseImpact > 0 ? (
                        <div>
                          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            owes you
                          </p>
                          <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            +{formatMoney(pairwiseImpact, expense.currency)}
                          </p>
                        </div>
                      ) : pairwiseImpact < 0 ? (
                        <div>
                          <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                            you owe
                          </p>
                          <p className="font-bold text-sm text-rose-600 dark:text-rose-400">
                            -{formatMoney(Math.abs(pairwiseImpact), expense.currency)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-[11px] text-muted-foreground">no balance</p>
                          <p className="font-medium text-xs text-muted-foreground">
                            {formatMoney(0, expense.currency)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center ml-1">
                      {!isRefundItem && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => onSelectRefundExpense(expense)}
                          title="Record refund for this expense"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteItem(expense)}
                        title="Delete transaction"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            const settlement = item as Settlement;
            const isMePayer = settlement.fromId === myId;

            return (
              <div
                key={settlement.id}
                className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-xs hover:border-border/80 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
                  <div
                    className={`p-2.5 rounded-full shrink-0 ${
                      isMePayer
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40'
                    }`}
                  >
                    <CurrencyIcon currency={settlement.currency || currency} className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate text-foreground">
                        {isMePayer ? `You paid ${person.name}` : `${person.name} paid you`}
                      </p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Settlement
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {settlement.method ? settlement.method.toUpperCase() : 'Payment'} •{' '}
                      {formatDisplayDate(settlement.date)}
                    </p>
                    {settlement.notes && (
                      <p className="text-[11px] text-muted-foreground/80 italic mt-0.5 truncate">
                        {settlement.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p
                      className={`text-[11px] font-semibold ${
                        isMePayer ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isMePayer ? 'You paid' : 'Received'}
                    </p>
                    <p
                      className={`font-bold text-sm ${
                        isMePayer ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {formatMoney(settlement.amountMinor, settlement.currency)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-1"
                    onClick={() => handleDeleteItem(settlement)}
                    title="Delete settlement"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default PersonActivityFeed;
