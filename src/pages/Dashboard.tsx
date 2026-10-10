import { useLiveQuery } from 'dexie-react-hooks';
import { getActiveExpenses, getActiveSettlements, getActivePeople, softDeleteExpense, softDeleteSettlement, restoreExpense, restoreSettlement } from '../db/repositories';
import { computePairwiseBalance } from '../domain/ledger';
import { formatMoney } from '../lib/money';
import { computeAnalyze } from '../domain/analyze';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, ArrowDownLeft, ArrowUpRight, Clock, Users, ArrowRight, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function Dashboard() {
  const expenses = useLiveQuery(() => getActiveExpenses()) || [];
  const settlements = useLiveQuery(() => getActiveSettlements()) || [];
  const people = useLiveQuery(() => getActivePeople()) || [];

  const me = people.find(p => p.isMe);
  const myId = me?.id || '';

  let totalOwedToMe = 0;
  let totalIOwe = 0;

  if (myId) {
    const friends = people.filter(p => !p.isMe);
    for (const friend of friends) {
      const bal = computePairwiseBalance(expenses, settlements, myId, friend.id, 'INR');
      if (bal > 0) totalOwedToMe += bal;
      if (bal < 0) totalIOwe += Math.abs(bal);
    }
  }




  // Recent activity: Combine expenses and settlements, sort by createdAt desc
  const activity = [...expenses, ...settlements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  const now = new Date();
  const analyzeResult = myId ? computeAnalyze(expenses, myId, 'INR', 'all') : null;
  const totalSpendThisMonth = analyzeResult ? analyzeResult.totalSpendMinor : 0;

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
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your shared finances</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Expense Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-card to-card border-primary/25 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Expense
            </CardTitle>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <IndianRupee className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
              {formatMoney(totalSpendThisMonth)}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time spending
            </p>
          </CardContent>
        </Card>

        {/* Owed to you Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500/15 via-card to-card border-emerald-500/25 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Owed to you
            </CardTitle>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
              {formatMoney(totalOwedToMe)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalOwedToMe > 0 ? 'Friends owe you' : 'All debts settled'}
            </p>
          </CardContent>
        </Card>

        {/* You owe Card */}
        <Card className="relative overflow-hidden bg-gradient-to-br from-rose-500/15 via-card to-card border-rose-500/25 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              You owe
            </CardTitle>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="space-y-0.5 pt-1">
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 truncate">
              {formatMoney(totalIOwe)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalIOwe > 0 ? 'You need to settle' : 'You have 0 debts'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Link
            to="/activity"
            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-4">
          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/30 rounded-xl border border-dashed">
              <Clock className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No activity yet</p>
              <p className="text-xs text-muted-foreground/70">Add an expense to get started</p>
            </div>
          ) : (
            activity.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-card rounded-lg border shadow-sm">
                <div className="flex items-center gap-4 min-w-0 flex-1 mr-3">
                  <div className={`p-2 rounded-full shrink-0 ${'description' in item ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'}`}>
                    {'description' in item ? <Users className="h-4 w-4" /> : <IndianRupee className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {'description' in item ? item.description : 'Payment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="font-semibold text-right">
                    {formatMoney(item.amountMinor)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteItem(item)}
                    title="Delete transaction"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
