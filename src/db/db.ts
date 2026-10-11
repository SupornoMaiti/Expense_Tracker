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
  }
}

export const db = new SplitLocalDB();

db.on('blocked', () => {
  console.warn('An app update is blocked by another open tab. Please close other tabs of this app and refresh.');
});

export async function exportBackup(): Promise<string> {
  const backup: Record<string, unknown> = {};
  for (const table of db.tables) {
    backup[table.name] = await table.toArray();
  }
  return JSON.stringify(backup);
}

export async function importBackup(jsonStr: string): Promise<void> {
  const parsed = JSON.parse(jsonStr);

  // Validate critical domain records before transaction
  if (parsed.expenses && Array.isArray(parsed.expenses)) {
    for (const row of parsed.expenses) {
      ExpenseSchema.parse(row);
    }
  }
  if (parsed.settlements && Array.isArray(parsed.settlements)) {
    for (const row of parsed.settlements) {
      SettlementSchema.parse(row);
    }
  }

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
      if (parsed[table.name]) {
        await table.bulkAdd(parsed[table.name]);
      }
    }
  });
}
