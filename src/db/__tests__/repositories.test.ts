import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import 'fake-indexeddb/auto'; // Mock IndexedDB
import { db } from '../db';
import { createExpense, getActiveExpenses, softDeleteExpense } from '../repositories';

describe('repositories', () => {
  beforeAll(async () => {
    // Clear any previous state in fake-indexeddb
    await db.delete();
    await db.open();
  });

  beforeEach(async () => {
    // Clear tables before each test
    await db.expenses.clear();
  });

  it('creates and retrieves an expense', async () => {
    const id = crypto.randomUUID();
    const catId = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    
    await createExpense({
      id,
      groupId: null,
      description: 'Test Expense',
      amountMinor: 500,
      currency: 'USD',
      date: '01-01-2026',
      categoryId: catId,
      payers: [{ personId: p1, amountMinor: 500 }],
      shares: [{ personId: p1, amountMinor: 500 }],
      participantIds: [p1],
      notes: '',
      splitType: 'equal'
    });

    const expenses = await getActiveExpenses();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].id).toBe(id);
    expect(expenses[0].description).toBe('Test Expense');
    expect(expenses[0].createdAt).toBeDefined();
    expect(expenses[0].deletedAt).toBeNull();
  });

  it('fails to create an expense if invariants are violated', async () => {
    const id = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    
    // amount is 500, but payers total 400
    await expect(createExpense({
      id,
      groupId: null,
      description: 'Test Expense',
      amountMinor: 500,
      currency: 'USD',
      date: '01-01-2026',
      categoryId: crypto.randomUUID(),
      payers: [{ personId: p1, amountMinor: 400 }], // invalid sum
      shares: [{ personId: p1, amountMinor: 500 }],
      participantIds: [p1],
      notes: '',
      splitType: 'equal'
    })).rejects.toThrow();
  });

  it('soft deletes an expense', async () => {
    const id = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    
    await createExpense({
      id,
      groupId: null,
      description: 'Test Expense',
      amountMinor: 500,
      currency: 'USD',
      date: '01-01-2026',
      categoryId: crypto.randomUUID(),
      payers: [{ personId: p1, amountMinor: 500 }],
      shares: [{ personId: p1, amountMinor: 500 }],
      participantIds: [p1],
      notes: '',
      splitType: 'equal'
    });

    await softDeleteExpense(id);

    // Should not be returned in active expenses
    const active = await getActiveExpenses();
    expect(active).toHaveLength(0);

    // But should still be in the DB with deletedAt
    const raw = await db.expenses.get(id);
    expect(raw?.deletedAt).not.toBeNull();
  });
});
