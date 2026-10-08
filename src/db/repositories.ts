import { db } from './db';
import type { Expense, Settlement, Person } from '../domain/types';
import { ExpenseSchema, SettlementSchema } from '../domain/schemas';

// --- EXPENSE REPOSITORY ---
export async function createExpense(data: Omit<Expense, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const expense: Expense = {
    ...data,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
  
  if (!Number.isInteger(expense.amountMinor)) throw new Error('amountMinor must be an integer');
  for (const payer of expense.payers) {
    if (!Number.isInteger(payer.amountMinor)) throw new Error('payer amountMinor must be an integer');
  }
  for (const share of expense.shares) {
    if (!Number.isInteger(share.amountMinor)) throw new Error('share amountMinor must be an integer');
  }

  // Zod Validation (will throw if invalid)
  ExpenseSchema.parse(expense);
  
  await db.expenses.add(expense);
  return expense.id;
}

export async function updateExpense(id: string, data: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>): Promise<void> {
  await db.transaction('rw', db.expenses, async () => {
    const existing = await db.expenses.get(id);
    if (!existing) throw new Error('Expense not found');
    if (existing.deletedAt) throw new Error('Cannot update deleted expense');

    const updated: Expense = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    };

    if (!Number.isInteger(updated.amountMinor)) throw new Error('amountMinor must be an integer');
    for (const payer of updated.payers) {
      if (!Number.isInteger(payer.amountMinor)) throw new Error('payer amountMinor must be an integer');
    }
    for (const share of updated.shares) {
      if (!Number.isInteger(share.amountMinor)) throw new Error('share amountMinor must be an integer');
    }

    ExpenseSchema.parse(updated);
    await db.expenses.put(updated);
  });
}

export async function softDeleteExpense(id: string): Promise<void> {
  await db.expenses.update(id, { deletedAt: new Date().toISOString() });
}

export async function restoreExpense(id: string): Promise<void> {
  await db.expenses.update(id, { deletedAt: null });
}

export async function getActiveExpenses(): Promise<Expense[]> {
  return db.expenses.filter(e => e.deletedAt === null).toArray();
}

export async function getActiveExpensesByGroupId(groupId: string): Promise<Expense[]> {
  return db.expenses.where({ groupId }).filter(e => e.deletedAt === null).toArray();
}


// --- SETTLEMENT REPOSITORY ---
export async function createSettlement(data: Omit<Settlement, 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const settlement: Settlement = {
    ...data,
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  };
  
  SettlementSchema.parse(settlement);
  
  await db.settlements.add(settlement);
  return settlement.id;
}

export async function softDeleteSettlement(id: string): Promise<void> {
  await db.settlements.update(id, { deletedAt: new Date().toISOString() });
}

export async function getActiveSettlements(): Promise<Settlement[]> {
  return db.settlements.filter(s => s.deletedAt === null).toArray();
}

export async function getActiveSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
  return db.settlements.where({ groupId }).filter(s => s.deletedAt === null).toArray();
}

// --- PERSON REPOSITORY ---
// Note: We don't have a strict Zod schema for Person yet, but we'd validate similarly
export async function createPerson(person: Person): Promise<string> {
  await db.people.add(person);
  return person.id;
}

export async function getPersonByPhone(phone: string): Promise<Person | undefined> {
  return db.people.where({ phone }).first();
}

export async function getActivePeople(): Promise<Person[]> {
  return db.people.filter(p => p.deletedAt === null && p.archivedAt === null).toArray();
}
