import { useLiveQuery } from 'dexie-react-hooks';
import { getActiveExpenses, getActiveSettlements, getActivePeople } from '../db/repositories';
import { computeBalances, simplifyDebts } from '../domain/ledger';
import { formatMoney } from '../lib/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee, ArrowDownLeft, ArrowUpRight, Clock, Users } from 'lucide-react';

export default function Dashboard() {
  const expenses = useLiveQuery(() => getActiveExpenses()) || [];
  const settlements = useLiveQuery(() => getActiveSettlements()) || [];
  const people = useLiveQuery(() => getActivePeople()) || [];

  const me = people.find(p => p.isMe);
  const myId = me?.id || '';

  // Only calculate INR for now since settings logic is not fully wired
  const balances = computeBalances(expenses, settlements).filter(b => b.currency === 'INR');
  
  let totalOwedToMe = 0;
  let totalIOwe = 0;

  // Let's use simplifyDebts to get exact amounts
  const debts = simplifyDebts(balances, 'INR');

  for (const d of debts) {
    if (d.toId === myId) totalOwedToMe += d.amountMinor;
    if (d.fromId === myId) totalIOwe += d.amountMinor;
  }

  const netBalance = totalOwedToMe - totalIOwe;



  // Recent activity: Combine expenses and settlements, sort by createdAt desc
  const activity = [...expenses, ...settlements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your shared finances</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Net Balance Card */}
        <Card className="bg-primary text-primary-foreground border-primary/20 shadow-lg shadow-primary/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium opacity-90">
              Net Balance
            </CardTitle>
            <IndianRupee className="h-4 w-4 opacity-75" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">
              {netBalance >= 0 ? '+' : '-'}{formatMoney(Math.abs(netBalance))}
            </div>
            <p className="text-xs opacity-75 mt-1">
              {netBalance >= 0 ? 'You are owed in total' : 'You owe in total'}
            </p>
          </CardContent>
        </Card>

        {/* Owed to you Card */}
        <Card className="border-green-500/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Owed to you
            </CardTitle>
            <ArrowDownLeft className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatMoney(totalOwedToMe)}
            </div>
          </CardContent>
        </Card>

        {/* You owe Card */}
        <Card className="border-red-500/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              You owe
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatMoney(totalIOwe)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
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
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${'description' in item ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' : 'bg-green-100 text-green-600 dark:bg-green-900/30'}`}>
                    {'description' in item ? <Users className="h-4 w-4" /> : <IndianRupee className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">
                      {'description' in item ? item.description : 'Settlement'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.date}
                    </p>
                  </div>
                </div>
                <div className="font-semibold text-right">
                  {formatMoney(item.amountMinor)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
