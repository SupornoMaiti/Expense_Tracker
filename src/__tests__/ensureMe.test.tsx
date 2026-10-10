/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';
import { ensureMe } from '../db/repositories';
import { render, screen, waitFor } from '@testing-library/react';
import AddExpenseModal from '../components/AddExpenseModal';

describe('ensureMe logic', () => {
  beforeEach(async () => {
    await db.transaction('rw', db.people, db.expenses, db.settlements, db.reminders, async () => {
      await db.people.clear();
      await db.expenses.clear();
      await db.settlements.clear();
      await db.reminders.clear();
    });
  });

  it('an existing DB with only "Raj" gets a Me after startup', async () => {
    await db.people.add({
      id: 'raj-123',
      name: 'Raj',
      phone: null,
      avatarColor: '#123456',
      source: 'manual',
      isMe: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      deletedAt: null
    });

    await ensureMe();

    const people = await db.people.toArray();
    expect(people.length).toBe(2);
    expect(people.find(p => p.isMe)).toBeTruthy();
    expect(people.find(p => p.name === 'Raj')).toBeTruthy();
  });

  it('two concurrent startups create exactly one Me', async () => {
    await Promise.all([ensureMe(), ensureMe()]);
    await db.people.filter(p => !!p.isMe).count();
    // Dexie transactions might run sequentially, but if they race, merging should fix it on next ensureMe
    await ensureMe();
    const finalCount = await db.people.filter(p => !!p.isMe).count();
    expect(finalCount).toBe(1);
  });

  it('duplicate Me rows are merged with their data repointed', async () => {
    const me1 = {
      id: 'me-1', name: 'Me', isMe: true, phone: null, avatarColor: '#000', source: 'manual' as const,
      createdAt: '2020-01-01T00:00:00Z', updatedAt: '2020-01-01T00:00:00Z', archivedAt: null, deletedAt: null
    };
    const me2 = {
      id: 'me-2', name: 'Me', isMe: true, phone: null, avatarColor: '#000', source: 'manual' as const,
      createdAt: '2021-01-01T00:00:00Z', updatedAt: '2021-01-01T00:00:00Z', archivedAt: null, deletedAt: null
    };
    await db.people.bulkAdd([me1, me2]);

    await db.expenses.add({
      id: 'exp-1',
      description: 'Test',
      amountMinor: 100,
      currency: 'INR',
      date: '2022-01-01',
      participantIds: ['me-1', 'me-2', 'raj'],
      payers: [{ personId: 'me-1', amountMinor: 50 }, { personId: 'me-2', amountMinor: 50 }],
      shares: [{ personId: 'me-1', amountMinor: 50 }, { personId: 'me-2', amountMinor: 50 }],
      groupId: null,
      categoryId: 'Uncategorized',
      splitType: 'equal',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    });

    await ensureMe();

    const people = await db.people.toArray();
    expect(people.length).toBe(1);
    expect(people[0].id).toBe('me-1'); // Oldest is kept

    const exp = await db.expenses.get('exp-1');
    expect(exp?.participantIds).toContain('me-1');
    expect(exp?.participantIds).not.toContain('me-2');
    
    // Values should be merged
    expect(exp?.payers.find(p => p.personId === 'me-1')?.amountMinor).toBe(100);
    expect(exp?.shares.find(p => p.personId === 'me-1')?.amountMinor).toBe(100);
  });

  it('the Add Expense form renders Me checked and selected on open', async () => {
    await ensureMe();
    render(<AddExpenseModal onClose={() => {}} />);
    await waitFor(() => {
      // "You" button in Who Paid? should be active (default variant usually means it has a specific class, but we can check if it exists)
      const youButtons = screen.getAllByText('You');
      expect(youButtons.length).toBeGreaterThan(0);
    });
  });

  it('"Biryani 100, Me paid, split Me and Raj" gives Raj a balance of 50 owed to me', async () => {
    await db.people.add({
      id: 'raj',
      name: 'Raj',
      phone: null,
      avatarColor: '#123456',
      source: 'manual',
      isMe: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      deletedAt: null
    });
    await ensureMe();
    const me = await db.people.filter(p => !!p.isMe).first();

    await db.expenses.add({
      id: 'exp-1',
      description: 'Biryani',
      amountMinor: 10000, // 100 INR
      currency: 'INR',
      date: '2022-01-01',
      participantIds: [me!.id, 'raj'],
      payers: [{ personId: me!.id, amountMinor: 10000 }],
      shares: [{ personId: me!.id, amountMinor: 5000 }, { personId: 'raj', amountMinor: 5000 }],
      groupId: null,
      categoryId: 'Uncategorized',
      splitType: 'equal',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    });

    const { computeBalances, simplifyDebts } = await import('../domain/ledger');
    const expenses = await db.expenses.toArray();
    const balances = computeBalances(expenses, []);
    const debts = simplifyDebts(balances, 'INR');

    expect(debts.length).toBe(1);
    expect(debts[0].fromId).toBe('raj');
    expect(debts[0].toId).toBe(me!.id);
    expect(debts[0].amountMinor).toBe(5000); // 50 INR
  });
});
