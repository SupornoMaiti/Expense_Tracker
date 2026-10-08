import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../db';
import type { Expense } from '../../domain/types';

describe('Dexie Database tests', () => {
  beforeEach(async () => {
    await db.expenses.clear();
    await db.settlements.clear();
  });

  afterEach(async () => {
    await db.expenses.clear();
    await db.settlements.clear();
  });

  it('rolls back a multi-record transaction completely if an error is thrown', async () => {
    const expense: Expense = {
      id: 'tx-rollback-1',
      groupId: null,
      description: 'Test Rollback',
      amountMinor: 1000,
      currency: 'INR',
      date: '2026-01-01',
      categoryId: 'c1',
      payers: [{ personId: 'p1', amountMinor: 1000 }],
      shares: [{ personId: 'p1', amountMinor: 1000 }],
      participantIds: ['p1'],
      notes: '',
      splitType: 'equal',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    };

    try {
      await db.transaction('rw', db.expenses, db.settlements, async () => {
        await db.expenses.add(expense);
        // Simulate error halfway through
        throw new Error('Simulated mid-write failure');
      });
    } catch {
      // Expected
    }

    const allExpenses = await db.expenses.toArray();
    // The transaction should have aborted, so the expense shouldn't exist
    expect(allExpenses).toHaveLength(0);
  });
});
