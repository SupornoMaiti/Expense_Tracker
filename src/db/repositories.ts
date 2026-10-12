import { db } from './db';
import type { Expense, Settlement, Person, Reminder } from '../domain/types';
import { ExpenseSchema, SettlementSchema } from '../domain/schemas';
import { generateId } from '../lib/utils';
import { allocateLargestRemainder } from '../domain/allocation';

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

export async function softDeleteExpense(id: string): Promise<{ deletedExpenseId: string; deletedRefundCount: number }> {
  const now = new Date().toISOString();
  let deletedRefundCount = 0;

  await db.transaction('rw', [db.expenses, db.settlements], async () => {
    await db.expenses.update(id, { deletedAt: now, updatedAt: now });

    // 1. Cascade soft-delete child refund expenses
    const refundExpenses = await db.expenses
      .where('refundOfId')
      .equals(id)
      .filter(e => !e.deletedAt)
      .toArray();

    for (const re of refundExpenses) {
      await db.expenses.update(re.id, { deletedAt: now, updatedAt: now });
      deletedRefundCount++;
    }

    // 2. Cascade soft-delete child refund settlements
    const refundSettlements = await db.settlements
      .where('refundOfId')
      .equals(id)
      .filter(s => !s.deletedAt)
      .toArray();
    const linkedSettlements = await db.settlements
      .where('expenseId')
      .equals(id)
      .filter(s => !s.deletedAt && s.refundOfId !== id)
      .toArray();

    for (const rs of [...refundSettlements, ...linkedSettlements]) {
      await db.settlements.update(rs.id, { deletedAt: now, updatedAt: now });
      deletedRefundCount++;
    }
  });

  return { deletedExpenseId: id, deletedRefundCount };
}

export async function restoreExpense(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.expenses, db.settlements], async () => {
    const expense = await db.expenses.get(id);
    if (!expense) return;

    // Verify parent is not deleted before restoring a child refund
    if (expense.refundOfId) {
      const parent = await db.expenses.get(expense.refundOfId);
      if (parent && parent.deletedAt) {
        throw new Error('Cannot restore a refund whose original expense is deleted');
      }
    }

    await db.expenses.update(id, { deletedAt: null, updatedAt: now });

    // Also restore linked refund expenses
    const refundExpenses = await db.expenses
      .where('refundOfId')
      .equals(id)
      .toArray();

    for (const re of refundExpenses) {
      await db.expenses.update(re.id, { deletedAt: null, updatedAt: now });
    }

    // Also restore linked refund settlements
    const refundSettlements = await db.settlements
      .where('refundOfId')
      .equals(id)
      .toArray();
    const linkedSettlements = await db.settlements
      .where('expenseId')
      .equals(id)
      .filter(s => s.refundOfId !== id)
      .toArray();

    for (const rs of [...refundSettlements, ...linkedSettlements]) {
      await db.settlements.update(rs.id, { deletedAt: null, updatedAt: now });
    }
  });
}

export async function createRefundForExpense(params: {
  originalExpenseId: string;
  amountMinor: number;
  date?: string;
  notes?: string;
}): Promise<string> {
  const original = await db.expenses.get(params.originalExpenseId);
  if (!original) throw new Error('Original expense not found');

  if (params.amountMinor <= 0) throw new Error('Refund amount must be positive');

  // Verify total existing active refunds for this expense
  const existingRefunds = await db.expenses
    .where('refundOfId')
    .equals(original.id)
    .filter(e => !e.deletedAt)
    .toArray();
  const alreadyRefunded = existingRefunds.reduce((sum, r) => sum + r.amountMinor, 0);

  if (alreadyRefunded + params.amountMinor > original.amountMinor) {
    const remainingRefundable = Math.max(0, original.amountMinor - alreadyRefunded);
    throw new Error(`Refund amount cannot exceed remaining refundable amount (${remainingRefundable})`);
  }

  // Allocate refund shares using Largest Remainder Method
  const allocatedShares = allocateLargestRemainder(
    params.amountMinor,
    original.shares.map(s => ({ personId: s.personId, rawValue: s.rawValue })),
    original.shares.map(s => s.amountMinor)
  );
  const shareMap = new Map(allocatedShares.map(s => [s.personId, s.amountMinor]));
  const refundShares = original.shares.map(s => ({
    personId: s.personId,
    amountMinor: shareMap.get(s.personId) ?? 0
  }));

  // Allocate refund payers using Largest Remainder Method
  const allocatedPayers = allocateLargestRemainder(
    params.amountMinor,
    original.payers.map(p => ({ personId: p.personId })),
    original.payers.map(p => p.amountMinor)
  );
  const payerMap = new Map(allocatedPayers.map(p => [p.personId, p.amountMinor]));
  const refundPayers = original.payers.map(p => ({
    personId: p.personId,
    amountMinor: payerMap.get(p.personId) ?? 0
  }));

  const now = new Date().toISOString();
  const date = params.date || original.date;

  const refundExpense: Expense = {
    id: generateId(),
    groupId: original.groupId,
    description: `Refund: ${original.description}`,
    amountMinor: params.amountMinor,
    currency: original.currency,
    date,
    categoryId: original.categoryId,
    payers: refundPayers,
    shares: refundShares,
    participantIds: original.participantIds,
    notes: params.notes || `Refund for "${original.description}"`,
    splitType: original.splitType,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    refundOfId: original.id,
    isRefund: true
  };

  ExpenseSchema.parse(refundExpense);
  await db.expenses.add(refundExpense);
  return refundExpense.id;
}

export async function getActiveExpenses(): Promise<Expense[]> {
  return db.expenses.filter(e => !e.deletedAt).toArray();
}

export async function getActiveExpensesByGroupId(groupId: string): Promise<Expense[]> {
  return db.expenses.where('groupId').equals(groupId).filter(e => !e.deletedAt).toArray();
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

export async function createRefundForSettlement(params: {
  originalSettlementId: string;
  notes?: string;
  date?: string;
}): Promise<string> {
  const original = await db.settlements.get(params.originalSettlementId);
  if (!original) throw new Error('Original settlement not found');

  const existingRefunds = await db.settlements
    .where('refundOfId')
    .equals(original.id)
    .filter(s => !s.deletedAt)
    .toArray();
  if (existingRefunds.length > 0) {
    throw new Error('Settlement has already been refunded');
  }

  const now = new Date().toISOString();
  const date = params.date || original.date;

  const refundSettlement: Settlement = {
    id: generateId(),
    groupId: original.groupId,
    fromId: original.toId,
    toId: original.fromId,
    amountMinor: original.amountMinor,
    currency: original.currency,
    method: original.method,
    date,
    notes: params.notes || `Refund for payment`,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    refundOfId: original.id,
  };

  SettlementSchema.parse(refundSettlement);
  await db.settlements.add(refundSettlement);
  return refundSettlement.id;
}

export async function softDeleteSettlement(id: string): Promise<{ deletedSettlementId: string; deletedRefundCount: number }> {
  const now = new Date().toISOString();
  let deletedRefundCount = 0;

  await db.transaction('rw', [db.settlements, db.expenses], async () => {
    await db.settlements.update(id, { deletedAt: now, updatedAt: now });

    const childSettlements = await db.settlements
      .where('refundOfId')
      .equals(id)
      .filter(s => !s.deletedAt)
      .toArray();

    for (const cs of childSettlements) {
      await db.settlements.update(cs.id, { deletedAt: now, updatedAt: now });
      deletedRefundCount++;
    }

    const childExpenses = await db.expenses
      .where('refundOfId')
      .equals(id)
      .filter(e => !e.deletedAt)
      .toArray();

    for (const ce of childExpenses) {
      await db.expenses.update(ce.id, { deletedAt: now, updatedAt: now });
      deletedRefundCount++;
    }
  });

  return { deletedSettlementId: id, deletedRefundCount };
}

export async function restoreSettlement(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction('rw', [db.settlements, db.expenses], async () => {
    await db.settlements.update(id, { deletedAt: null, updatedAt: now });

    const childSettlements = await db.settlements
      .where('refundOfId')
      .equals(id)
      .toArray();

    for (const cs of childSettlements) {
      await db.settlements.update(cs.id, { deletedAt: null, updatedAt: now });
    }

    const childExpenses = await db.expenses
      .where('refundOfId')
      .equals(id)
      .toArray();

    for (const ce of childExpenses) {
      await db.expenses.update(ce.id, { deletedAt: null, updatedAt: now });
    }
  });
}

export async function getActiveSettlements(): Promise<Settlement[]> {
  return db.settlements.filter(s => !s.deletedAt).toArray();
}

export async function getActiveSettlementsByGroupId(groupId: string): Promise<Settlement[]> {
  return db.settlements.where('groupId').equals(groupId).filter(s => !s.deletedAt).toArray();
}

// --- PERSON REPOSITORY ---
// Note: We don't have a strict Zod schema for Person yet, but we'd validate similarly
export async function createPerson(person: Person): Promise<string> {
  await db.people.add(person);
  return person.id;
}

export async function getPersonByPhone(phone: string): Promise<Person | undefined> {
  return db.people.where('phone').equals(phone).first();
}

export async function getActivePeople(): Promise<Person[]> {
  return db.people.filter(p => !p.deletedAt && !p.archivedAt).toArray();
}

export async function ensureMe(): Promise<void> {
  await db.transaction('rw', [db.people, db.expenses, db.settlements, db.reminders], async () => {
    const meRecords = await db.people.filter(p => !!p.isMe).toArray();
    
    // Ensure existing Me records are undeleted/unarchived
    for (const record of meRecords) {
      if (record.deletedAt || record.archivedAt) {
        record.deletedAt = null;
        record.archivedAt = null;
        await db.people.put(record);
      }
    }

    if (meRecords.length === 0) {
      const me: Person = {
        id: generateId(),
        name: 'Me',
        phone: null,
        avatarColor: '#4f46e5',
        source: 'manual',
        isMe: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        archivedAt: null,
        deletedAt: null,
      };
      await db.people.add(me);
    } else if (meRecords.length > 1) {
      // Sort by createdAt ascending (oldest first)
      meRecords.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const primaryMe = meRecords[0];
      const dupes = meRecords.slice(1);
      const dupeIds = new Set(dupes.map(d => d.id));

      // Batch repoint expenses (payers and shares)
      const expenses = await db.expenses.toArray();
      const changedExpenses: Expense[] = [];
      for (const exp of expenses) {
        let changed = false;

        if (exp.participantIds.some(id => dupeIds.has(id))) {
          exp.participantIds = exp.participantIds.filter(id => !dupeIds.has(id));
          if (!exp.participantIds.includes(primaryMe.id)) exp.participantIds.push(primaryMe.id);
          changed = true;
        }

        for (const payer of exp.payers) {
          if (dupeIds.has(payer.personId)) {
            payer.personId = primaryMe.id;
            changed = true;
          }
        }
        for (const share of exp.shares) {
          if (dupeIds.has(share.personId)) {
            share.personId = primaryMe.id;
            changed = true;
          }
        }

        // Merge identical personIds in payers/shares
        if (changed) {
          const mergedPayers: Record<string, typeof exp.payers[0]> = {};
          for (const p of exp.payers) {
            if (mergedPayers[p.personId]) mergedPayers[p.personId].amountMinor += p.amountMinor;
            else mergedPayers[p.personId] = { ...p };
          }
          exp.payers = Object.values(mergedPayers);

          const mergedShares: Record<string, typeof exp.shares[0]> = {};
          for (const s of exp.shares) {
            if (mergedShares[s.personId]) mergedShares[s.personId].amountMinor += s.amountMinor;
            else mergedShares[s.personId] = { ...s };
          }
          exp.shares = Object.values(mergedShares);

          changedExpenses.push(exp);
        }
      }
      if (changedExpenses.length > 0) {
        await db.expenses.bulkPut(changedExpenses);
      }

      // Batch repoint settlements
      const settlements = await db.settlements.toArray();
      const changedSettlements: Settlement[] = [];
      for (const set of settlements) {
        let changed = false;
        if (dupeIds.has(set.fromId)) { set.fromId = primaryMe.id; changed = true; }
        if (dupeIds.has(set.toId)) { set.toId = primaryMe.id; changed = true; }
        if (changed) changedSettlements.push(set);
      }
      if (changedSettlements.length > 0) {
        await db.settlements.bulkPut(changedSettlements);
      }

      // Batch repoint reminders
      const reminders = await db.reminders.toArray();
      const changedReminders: Reminder[] = [];
      for (const rem of reminders) {
        if (dupeIds.has(rem.personId)) {
          rem.personId = primaryMe.id;
          changedReminders.push(rem);
        }
      }
      if (changedReminders.length > 0) {
        await db.reminders.bulkPut(changedReminders);
      }

      for (const dupe of dupes) {
        await db.people.delete(dupe.id);
      }
    }
  });
}

export const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍔', color: '#f97316' },
  { name: 'Groceries', icon: '🛒', color: '#10b981' },
  { name: 'Transport', icon: '🚗', color: '#3b82f6' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { name: 'Bills & Utilities', icon: '💡', color: '#eab308' },
  { name: 'Health', icon: '💊', color: '#ef4444' },
  { name: 'General', icon: '📦', color: '#64748b' },
];

export async function ensureDefaultCategories(): Promise<void> {
  const activeCount = await db.categories.filter(c => !c.deletedAt).count();
  if (activeCount === 0) {
    const now = new Date().toISOString();
    const categoriesToAdd = DEFAULT_CATEGORIES.map(c => ({
      id: generateId(),
      name: c.name,
      icon: c.icon,
      color: c.color,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }));
    await db.categories.bulkAdd(categoriesToAdd);
  }
}

export async function seedSampleData(): Promise<void> {
  await ensureMe();
  await ensureDefaultCategories();

  const me = await db.people.filter(p => !!p.isMe).first();
  if (!me) return;
  const myId = me.id;

  const nowIso = new Date().toISOString();

  // Create dummy people if they don't exist
  const existingPeople = await db.people.toArray();
  const dummyDefs = [
    { name: 'Rahul Sharma', phone: '+919876543210', avatarColor: '#3b82f6' },
    { name: 'Priya Patel', phone: '+919876543211', avatarColor: '#ec4899' },
    { name: 'Amit Kumar', phone: '+919876543212', avatarColor: '#10b981' },
    { name: 'Sneha Gupta', phone: '+919876543213', avatarColor: '#f59e0b' },
  ];

  const peopleMap: Record<string, string> = {};
  for (const def of dummyDefs) {
    const person = existingPeople.find(p => p.name === def.name && !p.deletedAt);
    if (!person) {
      const id = generateId();
      await db.people.add({
        id,
        name: def.name,
        phone: def.phone,
        avatarColor: def.avatarColor,
        source: 'manual',
        isMe: false,
        createdAt: nowIso,
        updatedAt: nowIso,
        archivedAt: null,
        deletedAt: null,
      });
      peopleMap[def.name] = id;
    } else {
      peopleMap[def.name] = person.id;
    }
  }

  const rahulId = peopleMap['Rahul Sharma'];
  const priyaId = peopleMap['Priya Patel'];
  const amitId = peopleMap['Amit Kumar'];
  const snehaId = peopleMap['Sneha Gupta'];

  // Retrieve categories map
  const allCategories = await db.categories.toArray();
  const getCatId = (name: string) => allCategories.find(c => c.name.toLowerCase().includes(name.toLowerCase()))?.id || allCategories[0]?.id || generateId();

  // Create transactions on different dates
  const sampleExpenses = [
    {
      description: 'Team Dinner at Resthouse',
      amountMinor: 200000, // ₹2000.00
      date: '2026-10-09',
      categoryId: getCatId('Food'),
      payerId: myId,
      participantIds: [myId, rahulId, priyaId, amitId],
      sharePerPerson: 50000,
    },
    {
      description: 'Airport Uber Ride',
      amountMinor: 60000, // ₹600.00
      date: '2026-10-09',
      categoryId: getCatId('Transport'),
      payerId: rahulId,
      participantIds: [myId, rahulId],
      sharePerPerson: 30000,
    },
    {
      description: 'Supermarket Groceries',
      amountMinor: 140000, // ₹1400.00
      date: '2026-10-08',
      categoryId: getCatId('Groceries'),
      payerId: myId,
      participantIds: [myId, priyaId],
      sharePerPerson: 70000,
    },
    {
      description: 'Movie IMAX & Snacks',
      amountMinor: 90000, // ₹900.00
      date: '2026-10-07',
      categoryId: getCatId('Entertainment'),
      payerId: snehaId,
      participantIds: [myId, rahulId, snehaId],
      sharePerPerson: 30000,
    },
    {
      description: 'Apartment WiFi & Utilities',
      amountMinor: 150000, // ₹1500.00
      date: '2026-10-05',
      categoryId: getCatId('Bills'),
      payerId: myId,
      participantIds: [myId, amitId, priyaId],
      sharePerPerson: 50000,
    },
    {
      description: 'Cafe Coffee & Cookies',
      amountMinor: 40000, // ₹400.00
      date: '2026-10-03',
      categoryId: getCatId('Food'),
      payerId: priyaId,
      participantIds: [myId, priyaId],
      sharePerPerson: 20000,
    },
    {
      description: 'Pharmacy & First Aid',
      amountMinor: 55000, // ₹550.00
      date: '2026-10-01',
      categoryId: getCatId('Health'),
      payerId: myId,
      participantIds: [myId, snehaId],
      sharePerPerson: 27500,
    },
  ];

  for (const s of sampleExpenses) {
    const expId = generateId();
    const shares = s.participantIds.map(pid => ({ personId: pid, amountMinor: s.sharePerPerson }));
    await db.expenses.add({
      id: expId,
      groupId: null,
      description: s.description,
      amountMinor: s.amountMinor,
      currency: 'INR',
      date: s.date,
      categoryId: s.categoryId,
      payers: [{ personId: s.payerId, amountMinor: s.amountMinor }],
      shares,
      participantIds: s.participantIds,
      notes: '',
      splitType: 'equal',
      createdAt: `${s.date}T14:30:00.000Z`,
      updatedAt: `${s.date}T14:30:00.000Z`,
      deletedAt: null,
    });
  }

  // Create a settlement
  await db.settlements.add({
    id: generateId(),
    groupId: null,
    fromId: rahulId,
    toId: myId,
    amountMinor: 30000, // ₹300.00
    currency: 'INR',
    date: '2026-10-06',
    method: 'upi',
    notes: 'Settled via Google Pay',
    createdAt: '2026-10-06T18:00:00.000Z',
    updatedAt: '2026-10-06T18:00:00.000Z',
    deletedAt: null,
  });
}

export async function resetDatabase(options: { withSampleData?: boolean } = {}): Promise<void> {
  await db.transaction('rw', [
    db.people,
    db.expenses,
    db.settlements,
    db.reminders,
    db.categories,
    db.groups,
    db.receipts,
    db.settings,
  ], async () => {
    await db.people.clear();
    await db.expenses.clear();
    await db.settlements.clear();
    await db.reminders.clear();
    await db.categories.clear();
    await db.groups.clear();
    await db.receipts.clear();
    await db.settings.clear();
  });

  await ensureMe();
  await ensureDefaultCategories();
  await db.settings.put({
    id: 'user_settings',
    defaultCurrency: 'INR',
    defaultCountryCode: '+91',
    whatsappTemplate: 'Hi {name}, here is your pending balance:\n\n{breakdown}\n\nTotal pending: {amount}',
    theme: 'system',
    lastBackupAt: null,
  });

  if (options.withSampleData) {
    await seedSampleData();
  }
}

