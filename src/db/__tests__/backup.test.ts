import { describe, it, expect, beforeEach } from 'vitest';
import { db, exportBackup, importBackup } from '../db';
import type { Expense, Settlement } from '../../domain/types';

describe('Backup and restore logic', () => {
  beforeEach(async () => {
    await db.expenses.clear();
    await db.settlements.clear();
  });

  it('exports, wipes, and imports with identical data', async () => {
    const expense: Expense = {
      id: 'e1',
      groupId: null,
      description: 'Dinner',
      amountMinor: 500,
      currency: 'INR',
      date: '2026-01-01',
      categoryId: 'c1',
      payers: [{ personId: 'p1', amountMinor: 500 }],
      shares: [{ personId: 'p1', amountMinor: 250 }, { personId: 'p2', amountMinor: 250 }],
      participantIds: ['p1', 'p2'],
      notes: '',
      splitType: 'equal',
      createdAt: '2026-01-01T12:00:00Z',
      updatedAt: '2026-01-01T12:00:00Z',
      deletedAt: null,
    };

    const settlement: Settlement = {
      id: 's1',
      groupId: null,
      fromId: 'p2',
      toId: 'p1',
      amountMinor: 250,
      currency: 'INR',
      date: '2026-01-02',
      method: 'cash',
      notes: 'Paid',
      createdAt: '2026-01-02T12:00:00Z',
      updatedAt: '2026-01-02T12:00:00Z',
      deletedAt: null,
    };

    await db.expenses.add(expense);
    await db.settlements.add(settlement);

    const initialExpenses = await db.expenses.toArray();
    const initialSettlements = await db.settlements.toArray();

    // Export
    const backupJson = await exportBackup();
    
    // Wipe
    await db.expenses.clear();
    await db.settlements.clear();

    const wipedExpenses = await db.expenses.toArray();
    expect(wipedExpenses).toHaveLength(0);

    // Import
    await importBackup(backupJson);

    const restoredExpenses = await db.expenses.toArray();
    const restoredSettlements = await db.settlements.toArray();

    expect(restoredExpenses).toEqual(initialExpenses);
    expect(restoredSettlements).toEqual(initialSettlements);
  });

  it('JSON backup round trip preserves descriptions starting with = + - @', async () => {
    const expense: Expense = {
      id: 'e2',
      groupId: null,
      description: '=Dinner + Drinks - Discount @home', 
      amountMinor: 500,
      currency: 'INR',
      date: '2026-01-01',
      categoryId: 'c1',
      payers: [{ personId: 'p1', amountMinor: 500 }],
      shares: [{ personId: 'p1', amountMinor: 500 }],
      participantIds: ['p1'],
      notes: '',
      splitType: 'equal',
      createdAt: '2026-01-01T12:00:00Z',
      updatedAt: '2026-01-01T12:00:00Z',
      deletedAt: null,
    };
    await db.expenses.add(expense);

    const backupJson = await exportBackup();
    
    // Check that stringified JSON does not contain escaped quotes before the =
    const parsed = JSON.parse(backupJson) as { expenses: unknown[] };
    const savedExp = parsed.expenses[0] as Expense | undefined;
    expect(savedExp?.description).toBe('=Dinner + Drinks - Discount @home');
  });

  it('deduplicates duplicate phone numbers in people to avoid ConstraintError', async () => {
    const backupData = {
      schemaVersion: 1,
      data: {
        people: [
          {
            id: 'p1',
            name: 'Alice',
            phone: '+919999999999',
            avatarColor: '#10b981',
            source: 'manual',
            isMe: false,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            archivedAt: null,
            deletedAt: null
          },
          {
            id: 'p2',
            name: 'Alice Duplicate Phone',
            phone: '+919999999999',
            avatarColor: '#3b82f6',
            source: 'manual',
            isMe: false,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
            archivedAt: null,
            deletedAt: null
          }
        ],
        expenses: [],
        settlements: []
      }
    };

    await expect(importBackup(JSON.stringify(backupData))).resolves.not.toThrow();
    const people = await db.people.toArray();
    expect(people).toHaveLength(1);
    expect(people[0].phone).toBe('+919999999999');
  });
});
