import type { Expense } from './types';
import { toISODate } from '../lib/date';

interface CategorySpend {
  categoryId: string;
  amountMinor: number;
}

interface DailySpend {
  date: string;
  amountMinor: number;
}

export interface AnalyzeResult {
  totalSpendMinor: number;
  expenseCount: number;
  categories: CategorySpend[];
  dailySpend: DailySpend[];
}

export function computeAnalyze(
  expenses: Expense[],
  myId: string,
  currency: string,
  yearMonth: string | 'all'
): AnalyzeResult {
  let totalSpendMinor = 0;
  let expenseCount = 0;
  const catMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();

  for (const exp of expenses) {
    if (exp.deletedAt) continue;
    if (exp.currency !== currency) continue;
    
    // Normalize date to YYYY-MM-DD for consistent filtering
    const isoDate = toISODate(exp.date);
    if (yearMonth !== 'all' && !isoDate.startsWith(yearMonth)) continue;

    const myShare = exp.shares.find((s) => s.personId === myId);
    if (!myShare || myShare.amountMinor === 0) continue;

    const sign = exp.isRefund ? -1 : 1;
    totalSpendMinor += sign * myShare.amountMinor;
    if (!exp.isRefund) {
      expenseCount += 1;
    }
    
    const catId = exp.categoryId || 'Uncategorized';
    const current = catMap.get(catId) || 0;
    catMap.set(catId, current + sign * myShare.amountMinor);
    const currentDaily = dailyMap.get(isoDate) || 0;
    dailyMap.set(isoDate, currentDaily + sign * myShare.amountMinor);
  }

  const categories = Array.from(catMap.entries())
    .map(([categoryId, amountMinor]) => ({ categoryId, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor);

  const dailySpend = Array.from(dailyMap.entries())
    .map(([date, amountMinor]) => ({ date, amountMinor }))
    .sort((a, b) => a.date.localeCompare(b.date)); // chronological

  return { totalSpendMinor, expenseCount, categories, dailySpend };
}
