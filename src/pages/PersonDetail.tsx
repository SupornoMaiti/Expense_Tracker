import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import {
  getActiveExpenses,
  getActiveSettlements,
  softDeleteExpense,
  softDeleteSettlement,
  restoreExpense,
  restoreSettlement,
  getActivePeople
} from '../db/repositories';
import { computePairwiseBalance, getExpensePairwiseImpact } from '../domain/ledger';
import { formatMoney } from '../lib/money';
import { formatDisplayDate } from '../lib/date';
import { sendWhatsAppReminder } from '../lib/whatsapp';
import type { Reminder, Expense, Settlement } from '../domain/types';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MessageCircle,
  AlertCircle,
  Clock,
  MoreVertical,
  Edit2,
  Archive,
  Trash2,
  RotateCcw,
  ArrowDownLeft,
  ArrowUpRight,
  IndianRupee,
  CheckCircle2,
  Users
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { EditFriendModal } from '../components/EditFriendModal';
import AddRefundModal from '../components/AddRefundModal';
import { toast } from 'sonner';

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'settlement'>('all');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedRefundExpense, setSelectedRefundExpense] = useState<any>(null);

  const person = useLiveQuery(() => id ? db.people.get(id) : undefined, [id]);
  const me = useLiveQuery(() => db.people.filter(p => p.isMe).first());
  const allPeople = useLiveQuery(() => getActivePeople()) || [];
  const expenses = useLiveQuery(() => getActiveExpenses());
  const settlements = useLiveQuery(() => getActiveSettlements());
  const settingsArray = useLiveQuery(() => db.settings.toArray());

  if (person === undefined || me === undefined || expenses === undefined || settlements === undefined || settingsArray === undefined) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-muted mb-4" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!person || person.deletedAt) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not found</AlertTitle>
          <AlertDescription>This person does not exist or was deleted.</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const settings = settingsArray[0];
  const currency = settings?.defaultCurrency || 'INR';

  const myId = me.id;
  const friendId = person.id;

  // Helper to determine if a person is part of an expense
  const isPersonInExpense = (exp: Expense, pId: string) => {
    return (
      (exp.participantIds && exp.participantIds.includes(pId)) ||
      (exp.payers && exp.payers.some(p => p.personId === pId)) ||
      (exp.shares && exp.shares.some(s => s.personId === pId))
    );
  };

  // Shared expenses: any expense where there is a pairwise balance impact,
  // OR where both people are involved as payers/participants/shareholders.
  const sharedExpenses = expenses.filter(e => {
    const pairwiseImpact = getExpensePairwiseImpact(e, myId, friendId);
    if (pairwiseImpact !== 0) return true;
    return isPersonInExpense(e, myId) && isPersonInExpense(e, friendId);
  });

  // Shared settlements: direct payments between me and this friend
  const sharedSettlements = settlements.filter(s =>
    (s.fromId === myId && s.toId === friendId) ||
    (s.fromId === friendId && s.toId === myId)
  );

  // Combine and sort chronologically (newest first)
  const activity = [...sharedExpenses, ...sharedSettlements].sort((a, b) => {
    const dateA = a.date || (a.createdAt ? a.createdAt.split('T')[0] : '');
    const dateB = b.date || (b.createdAt ? b.createdAt.split('T')[0] : '');
    if (dateA !== dateB) return dateB.localeCompare(dateA);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const filteredActivity = activity.filter(item => {
    if (typeFilter === 'expense') return 'description' in item;
    if (typeFilter === 'settlement') return !('description' in item);
    return true;
  });

  // Net pairwise balance: positive = friend owes user, negative = user owes friend
  const netBalance = computePairwiseBalance(expenses, settlements, myId, friendId, currency);
  const isOwed = netBalance > 0;
  const isOwing = netBalance < 0;

  // Compute breakdown: what they owe you vs what you owe them from shared expenses and settlements
  let totalTheyOweMeFromExpenses = 0;
  let totalIOweThemFromExpenses = 0;
  let totalIPaidInSettlements = 0;
  let totalTheyPaidInSettlements = 0;

  for (const exp of sharedExpenses) {
    if (exp.currency !== currency) continue;
    const impact = getExpensePairwiseImpact(exp, myId, friendId);
    if (impact > 0) {
      totalTheyOweMeFromExpenses += impact;
    } else if (impact < 0) {
      totalIOweThemFromExpenses += Math.abs(impact);
    }
  }

  for (const st of sharedSettlements) {
    if (st.currency !== currency) continue;
    if (st.fromId === myId && st.toId === friendId) {
      totalIPaidInSettlements += st.amountMinor;
    } else if (st.fromId === friendId && st.toId === myId) {
      totalTheyPaidInSettlements += st.amountMinor;
    }
  }

  const totalSettledAmount = totalIPaidInSettlements + totalTheyPaidInSettlements;

  const handleArchive = async () => {
    if (!window.confirm('Are you sure you want to archive this friend? They will be hidden from the friends list.')) return;
    try {
      await db.people.update(person.id, {
        archivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      toast.success('Friend archived');
      navigate('/friends');
    } catch (e) {
      console.error(e);
      toast.error('Failed to archive friend');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDeleteItem = async (item: any) => {
    const isExpense = 'description' in item;
    const title = isExpense ? item.description : 'Payment';
    try {
      if (isExpense) {
        const result = await softDeleteExpense(item.id);
        const msg = result.deletedRefundCount > 0
          ? `Deleted "${title}" and ${result.deletedRefundCount} linked refund${result.deletedRefundCount > 1 ? 's' : ''}`
          : `Deleted "${title}"`;
        toast.success(msg, {
          action: { label: 'Undo', onClick: () => restoreExpense(item.id) },
        });
      } else {
        const result = await softDeleteSettlement(item.id);
        const msg = result.deletedRefundCount > 0
          ? `Deleted payment and ${result.deletedRefundCount} linked refund${result.deletedRefundCount > 1 ? 's' : ''}`
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
    <div className="space-y-6">
      {/* Friend Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div 
            className="h-12 w-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0"
            style={{ backgroundColor: person.avatarColor }}
          >
            {person.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{person.name}</h1>
            {person.phone && <p className="text-sm text-muted-foreground">{person.phone}</p>}
          </div>
        </div>

        {!person.isMe && (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleArchive} className="text-amber-600 focus:text-amber-600">
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Balance & Overview Card */}
      <div className="bg-card rounded-2xl border p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Current Net Balance
            </h2>
            {isOwed && (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatMoney(netBalance, currency)}
                </span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  owes you
                </span>
              </div>
            )}
            {isOwing && (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                  {formatMoney(Math.abs(netBalance), currency)}
                </span>
                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                  you owe
                </span>
              </div>
            )}
            {!isOwed && !isOwing && (
              <div className="flex items-center gap-2 text-xl font-bold text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                <span>All settled up (₹0.00)</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {isOwed
                ? `${person.name} owes you this balance.`
                : isOwing
                ? `You owe ${person.name} this balance.`
                : `You and ${person.name} are completely square.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {person.phone && (
              <Button 
                variant="outline" 
                className="text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                onClick={() => {
                  if (settings) {
                    const openLink = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
                    const askSent = () => true;
                    const logReminder = async (rem: Reminder) => { await db.reminders.add(rem); };
                    const now = () => new Date().toISOString();
                    sendWhatsAppReminder(person, myId, expenses, settlements, settings, { openLink, askSent, logReminder, now });
                  }
                }}
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Remind
              </Button>
            )}
            {netBalance !== 0 ? (
              <Button onClick={() => navigate(`/settle?friendId=${person.id}`)}>
                Settle Up
              </Button>
            ) : (
              <Button variant="outline" onClick={() => navigate(`/settle?friendId=${person.id}`)}>
                Record Payment
              </Button>
            )}
          </div>
        </div>

        {/* Breakdown Subcards: What they owe you vs What you owe them vs Settled */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t">
          {/* They owe you */}
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                They Owe You
              </p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {formatMoney(totalTheyOweMeFromExpenses, currency)}
              </p>
              <p className="text-[10px] text-muted-foreground">From shared expenses</p>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>

          {/* You owe them */}
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                You Owe Them
              </p>
              <p className="text-lg font-bold text-rose-700 dark:text-rose-300">
                {formatMoney(totalIOweThemFromExpenses, currency)}
              </p>
              <p className="text-[10px] text-muted-foreground">From shared expenses</p>
            </div>
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          {/* Total Settled */}
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-800 dark:text-blue-300">
                Total Settled
              </p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {formatMoney(totalSettledAmount, currency)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {sharedSettlements.length} settlement{sharedSettlements.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Section */}
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

                // Determine who paid
                const myPayment = expense.payers?.find(p => p.personId === myId)?.amountMinor || 0;
                const friendPayment = expense.payers?.find(p => p.personId === friendId)?.amountMinor || 0;

                let payerSummary = '';
                if (expense.payers && expense.payers.length === 1) {
                  const payerId = expense.payers[0].personId;
                  if (payerId === myId) {
                    payerSummary = `You paid ${formatMoney(expense.amountMinor, expense.currency)}`;
                  } else if (payerId === friendId) {
                    payerSummary = `${person.name} paid ${formatMoney(expense.amountMinor, expense.currency)}`;
                  } else {
                    const otherPayer = allPeople.find(p => p.id === payerId)?.name || 'Someone';
                    payerSummary = `${otherPayer} paid ${formatMoney(expense.amountMinor, expense.currency)}`;
                  }
                } else if (myPayment > 0 && friendPayment === 0) {
                  payerSummary = `You paid ${formatMoney(myPayment, expense.currency)}`;
                } else if (friendPayment > 0 && myPayment === 0) {
                  payerSummary = `${person.name} paid ${formatMoney(friendPayment, expense.currency)}`;
                } else if (myPayment > 0 && friendPayment > 0) {
                  payerSummary = `You paid ${formatMoney(myPayment, expense.currency)}, ${person.name} paid ${formatMoney(friendPayment, expense.currency)}`;
                } else {
                  payerSummary = `Total ${formatMoney(expense.amountMinor, expense.currency)}`;
                }

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-xs hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
                      <div className={`p-2.5 rounded-full shrink-0 ${isRefundItem ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40'}`}>
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

                    {/* Pairwise impact (what they owe you / what you owe them) */}
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

              // Settlement item
              const settlement = item as Settlement;
              const isMePayer = settlement.fromId === myId;

              return (
                <div
                  key={settlement.id}
                  className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-xs hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1 mr-3">
                    <div className={`p-2.5 rounded-full shrink-0 ${isMePayer ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40'}`}>
                      <IndianRupee className="h-4 w-4" />
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
                        {settlement.method ? settlement.method.toUpperCase() : 'Payment'} • {formatDisplayDate(settlement.date)}
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
                      <p className={`text-[11px] font-semibold ${isMePayer ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {isMePayer ? 'You paid' : 'Received'}
                      </p>
                      <p className={`font-bold text-sm ${isMePayer ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
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

      {editOpen && <EditFriendModal person={person} onClose={() => setEditOpen(false)} />}
      {selectedRefundExpense && (
        <AddRefundModal
          expense={selectedRefundExpense}
          onClose={() => setSelectedRefundExpense(null)}
        />
      )}
    </div>
  );
}

