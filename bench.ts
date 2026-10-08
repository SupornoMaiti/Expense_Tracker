import 'fake-indexeddb/auto';
import { db } from './src/db/db';
import { computeBalances } from './src/domain/ledger';
import type { Expense, Person } from './src/domain/types';
import { calculateShares } from './src/domain/allocation';

async function bench() {
  console.log('Seeding 10,000 expenses in fake-indexeddb (Node)...');
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
  
  await db.expenses.bulkAdd(expenses);
  const loadedExpenses = await db.expenses.toArray();

  const runs = 20;
  const computeTimes = [];
  const searchTimes = [];

  for (let i = 0; i < runs; i++) {
    const cStart = performance.now();
    computeBalances(loadedExpenses, []);
    computeTimes.push(performance.now() - cStart);

    const sStart = performance.now();
    loadedExpenses.filter(e => e.description.toLowerCase().includes('expense 9999'));
    searchTimes.push(performance.now() - sStart);
  }

  const sortNumbers = (arr: number[]) => arr.slice().sort((a, b) => a - b);
  
  const compSorted = sortNumbers(computeTimes);
  const searchSorted = sortNumbers(searchTimes);

  const formatStats = (name: string, arr: number[]) => {
    const min = arr[0].toFixed(2);
    const max = arr[arr.length - 1].toFixed(2);
    const median = arr[Math.floor(arr.length / 2)].toFixed(2);
    console.log(`${name}: min ${min}ms | median ${median}ms | max ${max}ms`);
  };

  console.log('\n--- Benchmark Results (20 runs, 10,000 expenses) ---');
  formatStats('computeBalances', compSorted);
  formatStats('Search (filter)', searchSorted);
  console.log('Environment: Node.js (fake-indexeddb)');
}

bench().catch(console.error);
