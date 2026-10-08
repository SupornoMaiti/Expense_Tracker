import { describe, it, expect } from 'vitest';
import { computeBalances } from '../ledger';
import type { Expense, Settlement } from '../types';
import { calculateShares } from '../allocation';

// Simple seeded LCG for deterministic tests
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

describe('property test: 1,000 randomized ledgers (fixed seed)', () => {
  it('always maintains zero sum invariant', () => {
    const random = mulberry32(12345); // Fixed seed
    const people = ['A', 'B', 'C', 'D', 'E'];
    const expenses: Expense[] = [];
    const settlements: Settlement[] = [];

    for (let i = 0; i < 1000; i++) {
      if (random() > 0.2) {
        const amount = Math.floor(random() * 10000) + 1;
        const payerId = people[Math.floor(random() * people.length)];
        const numParticipants = Math.floor(random() * 5) + 1;
        
        // Shuffle participants using seeded random
        const participants = [...people]
            .map(value => ({ value, sort: random() }))
            .sort((a, b) => a.sort - b.sort)
            .map(({ value }) => value)
            .slice(0, numParticipants);
        
        const shares = calculateShares(
          amount, 
          'equal', 
          participants.map(p => ({ personId: p }))
        );

        expenses.push({
          id: `e${i}`,
          groupId: null,
          description: `Rand ${i}`,
          amountMinor: amount,
          currency: 'USD',
          date: '01-01-2026',
          categoryId: 'c1',
          payers: [{ personId: payerId, amountMinor: amount }],
          shares,
          participantIds: participants,
          notes: '',
          splitType: 'equal',
          createdAt: '',
          updatedAt: '',
          deletedAt: null,
        });
      } else {
        const fromId = people[Math.floor(random() * people.length)];
        let toId = people[Math.floor(random() * people.length)];
        while (fromId === toId) {
          toId = people[Math.floor(random() * people.length)];
        }
        const amount = Math.floor(random() * 1000) + 1;

        settlements.push({
          id: `s${i}`,
          groupId: null,
          fromId,
          toId,
          amountMinor: amount,
          currency: 'USD',
          date: '01-01-2026',
          method: 'cash',
          notes: '',
          createdAt: '',
          updatedAt: '',
          deletedAt: null,
        });
      }
    }

    const balances = computeBalances(expenses, settlements);
    const sum = balances.reduce((acc, b) => acc + b.netAmountMinor, 0);
    expect(sum).toBe(0);
  });
});
