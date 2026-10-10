import { describe, it, expect } from 'vitest';
import { computeAnalyze } from '../analyze';
import type { Expense } from '../types';

describe('analyze domain logic', () => {
  it('equal split spend equals my share', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Dinner', amountMinor: 2000, currency: 'INR',
        date: '2026-01-15', categoryId: 'food', splitType: 'equal', notes: '',
        payers: [{ personId: 'p1', amountMinor: 2000 }],
        shares: [
          { personId: 'p1', amountMinor: 1000 },
          { personId: 'myId', amountMinor: 1000 }
        ],
        participantIds: ['p1', 'myId'], createdAt: '', updatedAt: '', deletedAt: null
      }
    ];

    const result = computeAnalyze(expenses, 'myId', 'INR', '2026-01');
    expect(result.totalSpendMinor).toBe(1000);
    expect(result.expenseCount).toBe(1);
    expect(result.categories).toEqual([{ categoryId: 'food', amountMinor: 1000 }]);
  });

  it('I paid but am not a participant is excluded', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Dinner', amountMinor: 2000, currency: 'INR',
        date: '2026-01-15', categoryId: 'food', splitType: 'equal', notes: '',
        payers: [{ personId: 'myId', amountMinor: 2000 }],
        shares: [
          { personId: 'p1', amountMinor: 2000 } // myId is not here
        ],
        participantIds: ['p1'], createdAt: '', updatedAt: '', deletedAt: null
      }
    ];

    const result = computeAnalyze(expenses, 'myId', 'INR', '2026-01');
    expect(result.totalSpendMinor).toBe(0);
    expect(result.expenseCount).toBe(0);
    expect(result.categories).toEqual([]);
  });

  it('deleted and settlements excluded', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Deleted', amountMinor: 2000, currency: 'INR',
        date: '2026-01-15', categoryId: 'food', splitType: 'equal', notes: '',
        payers: [{ personId: 'p1', amountMinor: 2000 }],
        shares: [{ personId: 'myId', amountMinor: 2000 }],
        participantIds: ['p1', 'myId'], createdAt: '', updatedAt: '', deletedAt: '2026-01-16'
      }
    ];

    const result = computeAnalyze(expenses, 'myId', 'INR', 'all');
    expect(result.totalSpendMinor).toBe(0);
  });

  it('two currencies separate', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'USD exp', amountMinor: 1000, currency: 'USD',
        date: '2026-01-15', categoryId: 'food', splitType: 'equal', notes: '',
        payers: [{ personId: 'p1', amountMinor: 1000 }],
        shares: [{ personId: 'myId', amountMinor: 1000 }],
        participantIds: ['p1', 'myId'], createdAt: '', updatedAt: '', deletedAt: null
      },
      {
        id: 'e2', groupId: null, description: 'INR exp', amountMinor: 1000, currency: 'INR',
        date: '2026-01-15', categoryId: 'food', splitType: 'equal', notes: '',
        payers: [{ personId: 'p1', amountMinor: 1000 }],
        shares: [{ personId: 'myId', amountMinor: 1000 }],
        participantIds: ['p1', 'myId'], createdAt: '', updatedAt: '', deletedAt: null
      }
    ];

    const usdResult = computeAnalyze(expenses, 'myId', 'USD', 'all');
    expect(usdResult.totalSpendMinor).toBe(1000);

    const inrResult = computeAnalyze(expenses, 'myId', 'INR', 'all');
    expect(inrResult.totalSpendMinor).toBe(1000);
  });

  it('2026-01-31 vs 2026-02-01 land in different months', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Jan', amountMinor: 1000, currency: 'INR',
        date: '2026-01-31', categoryId: 'food', splitType: 'equal', notes: '',
        payers: [{ personId: 'p1', amountMinor: 1000 }],
        shares: [{ personId: 'myId', amountMinor: 1000 }],
        participantIds: ['p1', 'myId'], createdAt: '', updatedAt: '', deletedAt: null
      },
      {
        id: 'e2', groupId: null, description: 'Feb', amountMinor: 2000, currency: 'INR',
        date: '2026-02-01', categoryId: 'food', splitType: 'equal', notes: '',
        payers: [{ personId: 'p1', amountMinor: 2000 }],
        shares: [{ personId: 'myId', amountMinor: 2000 }],
        participantIds: ['p1', 'myId'], createdAt: '', updatedAt: '', deletedAt: null
      }
    ];

    const janResult = computeAnalyze(expenses, 'myId', 'INR', '2026-01');
    expect(janResult.totalSpendMinor).toBe(1000);

    const febResult = computeAnalyze(expenses, 'myId', 'INR', '2026-02');
    expect(febResult.totalSpendMinor).toBe(2000);
  });

  it('category totals sum exactly to the period total', () => {
    const expenses: Expense[] = [
      {
        id: 'e1', groupId: null, description: 'Exp 1', amountMinor: 1000, currency: 'INR',
        date: '2026-01-01', categoryId: 'food', splitType: 'equal', notes: '',
        payers: [{ personId: 'p1', amountMinor: 1000 }],
        shares: [{ personId: 'myId', amountMinor: 1000 }],
        participantIds: ['p1', 'myId'], createdAt: '', updatedAt: '', deletedAt: null
      },
      {
        id: 'e2', groupId: null, description: 'Exp 2', amountMinor: 2000, currency: 'INR',
        date: '2026-01-05', categoryId: 'transport', splitType: 'equal', notes: '',
        payers: [{ personId: 'p1', amountMinor: 2000 }],
        shares: [{ personId: 'myId', amountMinor: 2000 }],
        participantIds: ['p1', 'myId'], createdAt: '', updatedAt: '', deletedAt: null
      }
    ];

    const result = computeAnalyze(expenses, 'myId', 'INR', '2026-01');
    expect(result.totalSpendMinor).toBe(3000);
    const sum = result.categories.reduce((acc, c) => acc + c.amountMinor, 0);
    expect(sum).toBe(3000);
  });

  it('empty period has no NaN', () => {
    const result = computeAnalyze([], 'myId', 'INR', '2026-01');
    expect(result.totalSpendMinor).toBe(0);
    expect(Number.isNaN(result.totalSpendMinor)).toBe(false);
    expect(result.categories).toEqual([]);
  });
});
