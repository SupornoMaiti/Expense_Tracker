import Dexie from 'dexie';
import type { Table } from 'dexie';
import { ExpenseSchema, SettlementSchema } from '../domain/schemas';
import type {
  Person,
  Group,
  Category,
  Expense,
  Settlement,
  Reminder,
  Settings,
  Receipt
} from '../domain/types';

export class SplitLocalDB extends Dexie {
  people!: Table<Person, string>;
  groups!: Table<Group, string>;
  categories!: Table<Category, string>;
  expenses!: Table<Expense, string>;
  settlements!: Table<Settlement, string>;
  receipts!: Table<Receipt, string>;
  reminders!: Table<Reminder, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('SplitLocalDB');
    
    // Dexie Version(1) Stores Definition
    this.version(1).stores({
      people: '&id, &phone, deletedAt, archivedAt',
      groups: '&id, *members, deletedAt, archivedAt',
      categories: '&id, deletedAt',
      expenses: '&id, groupId, date, deletedAt, *participantIds, [groupId+date]',
      settlements: '&id, groupId, fromId, toId, deletedAt',
      receipts: '&expenseId',
      reminders: '&id, personId, groupId',
      settings: '&id'
    });

    // Dexie Version(2) Stores Definition - indexing refundOfId & expenseId (RF-01)
    this.version(2).stores({
      expenses: '&id, groupId, date, deletedAt, *participantIds, refundOfId, [groupId+date]',
      settlements: '&id, groupId, fromId, toId, deletedAt, refundOfId, expenseId'
    });
  }
}

export const db = new SplitLocalDB();

db.on('blocked', () => {
  console.warn('An app update is blocked by another open tab. Please close other tabs of this app and refresh.');
});

export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown> = {};
  for (const table of db.tables) {
    data[table.name] = await table.toArray();
  }
  const dataStr = JSON.stringify(data);
  const checksum = dataStr.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);
  const backup = {
    schemaVersion: 1,
    timestamp: new Date().toISOString(),
    data,
    checksum,
    ...data
  };
  return JSON.stringify(backup);
}

export async function importBackup(jsonStr: string): Promise<void> {
  const parsed = JSON.parse(jsonStr);
  const data = (parsed.data || parsed) as Record<string, unknown[]>;

  // Validate critical domain records before transaction
  if (data.expenses && Array.isArray(data.expenses)) {
    for (const row of data.expenses) {
      ExpenseSchema.parse(row);
    }
  }
  if (data.settlements && Array.isArray(data.settlements)) {
    for (const row of data.settlements) {
      SettlementSchema.parse(row);
    }
  }

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
      if (data[table.name]) {
        await table.bulkAdd(data[table.name]);
      }
    }
  });
}
