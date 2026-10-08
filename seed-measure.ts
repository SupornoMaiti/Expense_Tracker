import 'fake-indexeddb/auto';
import { db } from './src/db/db';
import { computeBalances } from './src/domain/ledger';
import type { Expense, Person } from './src/domain/types';
import { calculateShares } from './src/domain/allocation';

async function seedAndMeasure() {
  await db.expenses.clear();
  await db.people.clear();
  await db.settlements.clear();

  const people: Person[] = [];
  for (let i = 0; i < 200; i++) {
    people.push({
      id: `p${i}`,
      name: `Person ${i}`,
      phone: null,
      avatarColor: '#000000',
      source: 'manual',
      isMe: i === 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      deletedAt: null
    });
  }
  await db.people.bulkAdd(people);

  const expenses: Expense[] = [];
  for (let i = 0; i < 10000; i++) {
    const amount = (i % 100) * 100 + 100; // 100 to 10000 minor units
    expenses.push({
      id: `e${i}`,
      groupId: null,
      description: `Expense ${i}`,
      amountMinor: amount,
      currency: 'INR',
      date: '2026-01-01',
      categoryId: 'c1',
      payers: [{ personId: `p${i % 200}`, amountMinor: amount }],
      shares: calculateShares(amount, 'equal', [
        { personId: `p${i % 200}` },
        { personId: `p${(i + 1) % 200}` },
        { personId: `p${(i + 2) % 200}` }
      ]),
      participantIds: [`p${i % 200}`, `p${(i + 1) % 200}`, `p${(i + 2) % 200}`],
      notes: '',
      splitType: 'equal',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null
    });
  }
  
  console.log('Seeding 10,000 expenses...');
  await db.expenses.bulkAdd(expenses);
  
  console.log('Starting balance computation measurement...');
  const start = performance.now();
  const loadedExpenses = await db.expenses.toArray();
  const balances = computeBalances(loadedExpenses, []);
  const end = performance.now();
  
  console.log(`Time taken to load and compute balances for 10,000 expenses: ${(end - start).toFixed(2)}ms (computed ${balances.length} balance entries)`);

  const searchStart = performance.now();
  const results = loadedExpenses.filter(e => e.description.toLowerCase().includes('expense 9999'));
  const searchEnd = performance.now();
  console.log(`Time taken to search 10,000 expenses: ${(searchEnd - searchStart).toFixed(2)}ms (found ${results.length})`);
}

seedAndMeasure().catch(console.error);
