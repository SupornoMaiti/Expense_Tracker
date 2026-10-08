import { useEffect, useState } from 'react';
import { db } from '../db/db';
import type { Expense } from '../domain/types';
import { formatMoney } from '../lib/money';

export default function Insights() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    db.expenses.toArray().then(setExpenses);
  }, []);

  const total = expenses.reduce((acc, curr) => acc + curr.amountMinor, 0);

  // Group by participant to show a simple breakdown
  const perPerson = expenses.reduce((acc, curr) => {
    curr.shares.forEach(s => {
      acc[s.personId] = (acc[s.personId] || 0) + s.amountMinor;
    });
    return acc;
  }, {} as Record<string, number>);

  const sorted = Object.entries(perPerson).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Insights</h1>
      <div className="bg-card p-4 rounded-xl border">
        <h2 className="font-semibold mb-4 text-muted-foreground">Total Expenses Logged</h2>
        <div className="text-4xl font-bold">
          {formatMoney(total)}
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border space-y-4">
        <h2 className="font-semibold text-muted-foreground">Top Spenders (All Time)</h2>
        <div className="space-y-3">
          {sorted.slice(0, 5).map(([personId, amount]) => {
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={personId} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{personId.replace('p', 'Person ')}</span>
                  <span className="font-medium">{formatMoney(amount)} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden flex">
                  <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <div className="text-sm text-muted-foreground">No expenses logged yet.</div>}
        </div>
      </div>
    </div>
  );
}
