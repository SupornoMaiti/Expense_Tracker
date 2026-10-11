import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import 'fake-indexeddb/auto'; // Mock IndexedDB
import { db } from '../db';
import {
  createExpense,
  getActiveExpenses,
  softDeleteExpense,
  restoreExpense,
  createRefundForExpense,
  createSettlement,
  getActiveSettlements,
  softDeleteSettlement,
  restoreSettlement,
  createRefundForSettlement,
} from '../repositories';

describe('repositories', () => {
  beforeAll(async () => {
    // Clear any previous state in fake-indexeddb
    await db.delete();
    await db.open();
  });

  beforeEach(async () => {
    // Clear tables before each test
    await db.expenses.clear();
    await db.settlements.clear();
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

  it('cascades soft-delete to linked refund expenses and restores both on undo', async () => {
    const id = crypto.randomUUID();
    const catId = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    const p2 = crypto.randomUUID();

    // Create an original expense: p1 paid 1000, split 500 each between p1 and p2
    await createExpense({
      id,
      groupId: null,
      description: 'Team Dinner',
      amountMinor: 1000,
      currency: 'INR',
      date: '01-01-2026',
      categoryId: catId,
      payers: [{ personId: p1, amountMinor: 1000 }],
      shares: [
        { personId: p1, amountMinor: 500 },
        { personId: p2, amountMinor: 500 }
      ],
      participantIds: [p1, p2],
      notes: 'Dinner bill',
      splitType: 'equal'
    });

    // Create a refund of 400 for this expense
    const refundExpenseId = await createRefundForExpense({
      originalExpenseId: id,
      amountMinor: 400,
      notes: 'Partial restaurant refund'
    });

    // Before deletion, both are active
    let active = await getActiveExpenses();
    expect(active).toHaveLength(2);
    const refundDoc = await db.expenses.get(refundExpenseId);
    expect(refundDoc?.refundOfId).toBe(id);
    expect(refundDoc?.isRefund).toBe(true);

    // Soft delete the original expense
    const deleteResult = await softDeleteExpense(id);
    expect(deleteResult.deletedExpenseId).toBe(id);
    expect(deleteResult.deletedRefundCount).toBe(1);

    // Active expenses should now be empty (both parent and child refund removed)
    active = await getActiveExpenses();
    expect(active).toHaveLength(0);

    // Verify both have deletedAt set in the database
    const rawParent = await db.expenses.get(id);
    const rawRefund = await db.expenses.get(refundExpenseId);
    expect(rawParent?.deletedAt).not.toBeNull();
    expect(rawRefund?.deletedAt).not.toBeNull();

    // Now restore the parent expense
    await restoreExpense(id);

    // Active expenses should restore both parent and refund
    active = await getActiveExpenses();
    expect(active).toHaveLength(2);
    const restoredParent = await db.expenses.get(id);
    const restoredRefund = await db.expenses.get(refundExpenseId);
    expect(restoredParent?.deletedAt).toBeNull();
    expect(restoredRefund?.deletedAt).toBeNull();
  });

  it('cascades soft-delete to linked refund settlements when parent expense is deleted', async () => {
    const expenseId = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    const p2 = crypto.randomUUID();

    await createExpense({
      id: expenseId,
      groupId: null,
      description: 'Flight Tickets',
      amountMinor: 2000,
      currency: 'INR',
      date: '01-01-2026',
      categoryId: crypto.randomUUID(),
      payers: [{ personId: p1, amountMinor: 2000 }],
      shares: [{ personId: p1, amountMinor: 1000 }, { personId: p2, amountMinor: 1000 }],
      participantIds: [p1, p2],
      notes: '',
      splitType: 'equal'
    });

    // Create a settlement referencing this expense as a refund
    const settlementId = crypto.randomUUID();
    await createSettlement({
      id: settlementId,
      groupId: null,
      fromId: p2,
      toId: p1,
      amountMinor: 500,
      currency: 'INR',
      method: 'upi',
      date: '02-01-2026',
      notes: 'Refund for flight',
      expenseId: expenseId
    });

    expect(await getActiveExpenses()).toHaveLength(1);
    expect(await getActiveSettlements()).toHaveLength(1);

    // Soft-deleting the expense should also soft-delete the linked settlement
    const deleteResult = await softDeleteExpense(expenseId);
    expect(deleteResult.deletedRefundCount).toBe(1);

    expect(await getActiveExpenses()).toHaveLength(0);
    expect(await getActiveSettlements()).toHaveLength(0);

    // Restoring expense restores both
    await restoreExpense(expenseId);
    expect(await getActiveExpenses()).toHaveLength(1);
    expect(await getActiveSettlements()).toHaveLength(1);
  });

  it('cascades soft-delete to refund settlements when parent settlement is deleted', async () => {
    const s1Id = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    const p2 = crypto.randomUUID();

    await createSettlement({
      id: s1Id,
      groupId: null,
      fromId: p1,
      toId: p2,
      amountMinor: 500,
      currency: 'INR',
      method: 'upi',
      date: '01-01-2026',
      notes: 'Initial settlement'
    });

    // Create refund for this settlement
    const refundSettlementId = await createRefundForSettlement({
      originalSettlementId: s1Id,
      notes: 'Settlement reversed'
    });

    expect(await getActiveSettlements()).toHaveLength(2);

    const deleteResult = await softDeleteSettlement(s1Id);
    expect(deleteResult.deletedSettlementId).toBe(s1Id);
    expect(deleteResult.deletedRefundCount).toBe(1);

    expect(await getActiveSettlements()).toHaveLength(0);

    // Restore parent settlement
    await restoreSettlement(s1Id);
    expect(await getActiveSettlements()).toHaveLength(2);

    const rawRefund = await db.settlements.get(refundSettlementId);
    expect(rawRefund?.deletedAt).toBeNull();
  });

  it('resets database to clean slate or sample data', async () => {
    // Add an expense
    await createExpense({
      id: crypto.randomUUID(),
      groupId: null,
      description: 'Test Reset Expense',
      amountMinor: 300,
      currency: 'INR',
      date: '01-01-2026',
      categoryId: crypto.randomUUID(),
      payers: [{ personId: crypto.randomUUID(), amountMinor: 300 }],
      shares: [{ personId: crypto.randomUUID(), amountMinor: 300 }],
      participantIds: [crypto.randomUUID()],
      notes: '',
      splitType: 'equal'
    });

    expect(await getActiveExpenses()).toHaveLength(1);

    // Call resetDatabase clean
    const { resetDatabase } = await import('../repositories');
    await resetDatabase({ withSampleData: false });

    // Should have 0 expenses, but 'Me' user and categories recreated
    expect(await getActiveExpenses()).toHaveLength(0);
    const people = await db.people.toArray();
    expect(people).toHaveLength(1);
    expect(people[0].isMe).toBe(true);

    const categories = await db.categories.toArray();
    expect(categories.length).toBeGreaterThan(0);
  });

  it('createRefundForExpense correctly assigns payers and shares summing to amountMinor (C1)', async () => {
    const parentId = crypto.randomUUID();
    const alice = crypto.randomUUID();
    const bob = crypto.randomUUID();
    const catId = crypto.randomUUID();

    // Alice paid 600, split equally between Alice (300) and Bob (300)
    await createExpense({
      id: parentId,
      groupId: null,
      description: 'Dinner Party',
      amountMinor: 600,
      currency: 'USD',
      date: '01-01-2026',
      categoryId: catId,
      payers: [{ personId: alice, amountMinor: 600 }],
      shares: [{ personId: alice, amountMinor: 300 }, { personId: bob, amountMinor: 300 }],
      participantIds: [alice, bob],
      notes: '',
      splitType: 'equal'
    });

    // Create partial refund of 300
    const refundId = await createRefundForExpense({
      originalExpenseId: parentId,
      amountMinor: 300
    });

    const refund = await db.expenses.get(refundId);
    expect(refund).toBeDefined();
    expect(refund?.isRefund).toBe(true);
    expect(refund?.refundOfId).toBe(parentId);

    // Payers must be derived from original payers (Alice), shares from original shares (Alice & Bob)
    const sumPayers = refund!.payers.reduce((sum, p) => sum + p.amountMinor, 0);
    const sumShares = refund!.shares.reduce((sum, s) => sum + s.amountMinor, 0);

    expect(sumPayers).toBe(300);
    expect(sumShares).toBe(300);

    // Alice was original payer, so Alice is in refund.payers
    expect(refund!.payers[0].personId).toBe(alice);
    expect(refund!.payers[0].amountMinor).toBe(300);

    // Shares reflect the recipients of the original expense
    expect(refund!.shares).toHaveLength(2);
    expect(refund!.shares.find(s => s.personId === alice)?.amountMinor).toBe(150);
    expect(refund!.shares.find(s => s.personId === bob)?.amountMinor).toBe(150);
  });

  it('getActiveExpenses excludes soft-deleted items (H3)', async () => {
    const id = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    await createExpense({
      id,
      groupId: null,
      description: 'Active Check',
      amountMinor: 100,
      currency: 'USD',
      date: '01-01-2026',
      categoryId: crypto.randomUUID(),
      payers: [{ personId: p1, amountMinor: 100 }],
      shares: [{ personId: p1, amountMinor: 100 }],
      participantIds: [p1],
      notes: '',
      splitType: 'equal'
    });

    expect(await getActiveExpenses()).toHaveLength(1);
    await softDeleteExpense(id);
    expect(await getActiveExpenses()).toHaveLength(0);
  });

  it('restoreExpense throws when trying to restore child refund whose parent is deleted (M4)', async () => {
    const parentId = crypto.randomUUID();
    const p1 = crypto.randomUUID();
    await createExpense({
      id: parentId,
      groupId: null,
      description: 'Parent Expense',
      amountMinor: 200,
      currency: 'USD',
      date: '01-01-2026',
      categoryId: crypto.randomUUID(),
      payers: [{ personId: p1, amountMinor: 200 }],
      shares: [{ personId: p1, amountMinor: 200 }],
      participantIds: [p1],
      notes: '',
      splitType: 'equal'
    });

    const refundId = await createRefundForExpense({
      originalExpenseId: parentId,
      amountMinor: 100
    });

    // Soft delete both
    await softDeleteExpense(parentId);

    // Attempting to restore child directly while parent is deleted should fail
    await expect(restoreExpense(refundId)).rejects.toThrow('Cannot restore a refund whose original expense is deleted');
  });
});
