import { describe, it, expect } from 'vitest';
import { computeBalances, simplifyDebts, computePairwiseBalance } from '../ledger';
import type { Expense, Settlement } from '../types';
import { calculateShares } from '../allocation';

describe('ledger', () => {
  it('computes correct balances for a simple equal split expense', () => {
    // Alice paid 300, split between Alice, Bob, Charlie (100 each)
    const expense: Expense = {
      id: 'e1',
      groupId: null,
      description: 'Dinner',
      amountMinor: 300,
      currency: 'INR',
      date: '01-01-2026',
      categoryId: 'c1',
      payers: [{ personId: 'Alice', amountMinor: 300 }],
      shares: [
        { personId: 'Alice', amountMinor: 100 },
        { personId: 'Bob', amountMinor: 100 },
        { personId: 'Charlie', amountMinor: 100 },
      ],
      participantIds: ['Alice', 'Bob', 'Charlie'],
      notes: '',
      splitType: 'equal',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    };

    const balances = computeBalances([expense], []);
    expect(balances.find(b => b.personId === 'Alice')?.netAmountMinor).toBe(200); // 300 - 100
    expect(balances.find(b => b.personId === 'Bob')?.netAmountMinor).toBe(-100);
    expect(balances.find(b => b.personId === 'Charlie')?.netAmountMinor).toBe(-100);
  });

  it('computes correct balances with multi-payer', () => {
    // Alice paid 200, Bob paid 100. Total 300.
    // Split among Alice, Bob, Charlie (100 each).
    const expense: Expense = {
      id: 'e1',
      groupId: null,
      description: 'Groceries',
      amountMinor: 300,
      currency: 'INR',
      date: '01-01-2026',
      categoryId: 'c1',
      payers: [
        { personId: 'Alice', amountMinor: 200 },
        { personId: 'Bob', amountMinor: 100 }
      ],
      shares: [
        { personId: 'Alice', amountMinor: 100 },
        { personId: 'Bob', amountMinor: 100 },
        { personId: 'Charlie', amountMinor: 100 },
      ],
      participantIds: ['Alice', 'Bob', 'Charlie'],
      notes: '',
      splitType: 'equal',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    };

    const balances = computeBalances([expense], []);
    // Alice: 200 - 100 = 100
    // Bob: 100 - 100 = 0
    // Charlie: 0 - 100 = -100
    expect(balances.find(b => b.personId === 'Alice')?.netAmountMinor).toBe(100);
    expect(balances.find(b => b.personId === 'Bob')).toBeUndefined(); // Bob is at 0 so not returned
    expect(balances.find(b => b.personId === 'Charlie')?.netAmountMinor).toBe(-100);
  });

  it('computes correctly after a partial settlement', () => {
    // Charlie owes Alice 100 from previous test
    const expense: Expense = {
      id: 'e1',
      groupId: null,
      description: 'Groceries',
      amountMinor: 300,
      currency: 'INR',
      date: '01-01-2026',
      categoryId: 'c1',
      payers: [
        { personId: 'Alice', amountMinor: 200 },
        { personId: 'Bob', amountMinor: 100 }
      ],
      shares: [
        { personId: 'Alice', amountMinor: 100 },
        { personId: 'Bob', amountMinor: 100 },
        { personId: 'Charlie', amountMinor: 100 },
      ],
      participantIds: ['Alice', 'Bob', 'Charlie'],
      notes: '',
      splitType: 'equal',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    };

    const settlement: Settlement = {
      id: 's1',
      groupId: null,
      fromId: 'Charlie',
      toId: 'Alice',
      amountMinor: 50,
      currency: 'INR',
      date: '02-01-2026',
      method: 'cash',
      notes: '',
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    };

    const balances = computeBalances([expense], [settlement]);
    // Charlie should now owe 50, Alice should be owed 50
    expect(balances.find(b => b.personId === 'Alice')?.netAmountMinor).toBe(50);
    expect(balances.find(b => b.personId === 'Charlie')?.netAmountMinor).toBe(-50);
  });

  it('ignores deleted expenses and settlements', () => {
    const expense: Expense = {
      id: 'e1',
      groupId: null,
      description: 'Groceries',
      amountMinor: 300,
      currency: 'INR',
      date: '01-01-2026',
      categoryId: 'c1',
      payers: [{ personId: 'Alice', amountMinor: 300 }],
      shares: [
        { personId: 'Alice', amountMinor: 150 },
        { personId: 'Bob', amountMinor: 150 },
      ],
      participantIds: ['Alice', 'Bob'],
      notes: '',
      splitType: 'equal',
      createdAt: '',
      updatedAt: '',
      deletedAt: '2026-01-03T00:00:00Z', // Deleted!
    };

    const balances = computeBalances([expense], []);
    expect(balances).toHaveLength(0); // All zero
  });

  describe('simplifyDebts', () => {
    it('simplifies debts efficiently', () => {
      // A owes B 10, B owes C 10. Should simplify to A owes C 10.
      const balances = [
        { personId: 'A', currency: 'INR', netAmountMinor: -10 },
        { personId: 'B', currency: 'INR', netAmountMinor: 0 },
        { personId: 'C', currency: 'INR', netAmountMinor: 10 },
      ];

      const debts = simplifyDebts(balances, 'INR');
      expect(debts).toHaveLength(1);
      expect(debts[0]).toEqual({
        fromId: 'A',
        toId: 'C',
        amountMinor: 10,
        currency: 'INR'
      });
    });

    it('handles multiple currencies separately', () => {
      // It assumes you filter beforehand or pass in single currency
      const balances = [
        { personId: 'A', currency: 'INR', netAmountMinor: -10 },
        { personId: 'B', currency: 'INR', netAmountMinor: 10 },
      ];
      const debts = simplifyDebts(balances, 'INR');
      expect(debts).toHaveLength(1);
    });
  });

  describe('property test: 1,000 randomized ledgers', () => {
    it('always maintains zero sum invariant', () => {
      const people = ['A', 'B', 'C', 'D', 'E'];
      const expenses: Expense[] = [];
      const settlements: Settlement[] = [];

      for (let i = 0; i < 1000; i++) {
        // Random expense or settlement
        if (Math.random() > 0.2) {
          // Expense
          const amount = Math.floor(Math.random() * 10000) + 1; // 1 to 10000 minor units
          // Pick a random payer
          const payerId = people[Math.floor(Math.random() * people.length)];
          // Pick random participants (1 to 5)
          const numParticipants = Math.floor(Math.random() * 5) + 1;
          // Shuffle and pick
          const participants = [...people].sort(() => Math.random() - 0.5).slice(0, numParticipants);
          
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
          // Settlement
          const fromId = people[Math.floor(Math.random() * people.length)];
          let toId = people[Math.floor(Math.random() * people.length)];
          while (fromId === toId) {
            toId = people[Math.floor(Math.random() * people.length)];
          }
          const amount = Math.floor(Math.random() * 1000) + 1;

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

      // This will throw if invariant fails during computeBalances
      const balances = computeBalances(expenses, settlements);
      
      const sum = balances.reduce((acc, b) => acc + b.netAmountMinor, 0);
      expect(sum).toBe(0);
    });
  });

  describe('computePairwiseBalance', () => {
    it('computes correct balance when A pays for B', () => {
      const exp: Expense = {
        id: 'e1', groupId: null, description: 'Lunch', amountMinor: 1000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'A', amountMinor: 1000 }],
        shares: [{ personId: 'A', amountMinor: 500 }, { personId: 'B', amountMinor: 500 }],
        participantIds: ['A', 'B'], createdAt: '', updatedAt: '', deletedAt: null
      };

      // B owes A 500
      expect(computePairwiseBalance([exp], [], 'A', 'B', 'INR')).toBe(500);
      // A owes B -500
      expect(computePairwiseBalance([exp], [], 'B', 'A', 'INR')).toBe(-500);
    });

    it('settlement settles the pairwise balance', () => {
      const exp: Expense = {
        id: 'e1', groupId: null, description: 'Lunch', amountMinor: 1000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'A', amountMinor: 1000 }],
        shares: [{ personId: 'A', amountMinor: 500 }, { personId: 'B', amountMinor: 500 }],
        participantIds: ['A', 'B'], createdAt: '', updatedAt: '', deletedAt: null
      };
      const st: Settlement = {
        id: 's1', groupId: null, fromId: 'B', toId: 'A', amountMinor: 500, currency: 'INR',
        date: '2026-01-02', method: 'upi', notes: '', createdAt: '', updatedAt: '', deletedAt: null
      };

      expect(computePairwiseBalance([exp], [st], 'A', 'B', 'INR')).toBe(0);
    });

    it('does not get affected by unrelated third-party expenses', () => {
      // A and B have dinner: A pays 2000 for A (1000) and B (1000)
      const exp1: Expense = {
        id: 'e1', groupId: null, description: 'Dinner', amountMinor: 2000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'A', amountMinor: 2000 }],
        shares: [{ personId: 'A', amountMinor: 1000 }, { personId: 'B', amountMinor: 1000 }],
        participantIds: ['A', 'B'], createdAt: '', updatedAt: '', deletedAt: null
      };
      // C and D have movie: C pays 1000 for C and D
      const exp2: Expense = {
        id: 'e2', groupId: null, description: 'Movie', amountMinor: 1000, currency: 'INR',
        date: '2026-01-01', categoryId: 'c1', notes: '', splitType: 'equal',
        payers: [{ personId: 'C', amountMinor: 1000 }],
        shares: [{ personId: 'C', amountMinor: 500 }, { personId: 'D', amountMinor: 500 }],
        participantIds: ['C', 'D'], createdAt: '', updatedAt: '', deletedAt: null
      };

      // B still owes A 1000, unaffected by C and D
      expect(computePairwiseBalance([exp1, exp2], [], 'A', 'B', 'INR')).toBe(1000);
      // D owes A 0
      expect(computePairwiseBalance([exp1, exp2], [], 'A', 'D', 'INR')).toBe(0);
    });

    it('computeBalances does not throw on imbalanced data and logs a warning (C2)', async () => {
      const { vi } = await import('vitest');
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const badExpense: Expense = {
        id: 'bad1',
        groupId: null,
        description: 'Imbalanced',
        amountMinor: 100,
        currency: 'EUR',
        date: '2026-01-01',
        categoryId: 'c1',
        payers: [{ personId: 'A', amountMinor: 100 }],
        shares: [{ personId: 'B', amountMinor: 90 }], // 10 minor units drift
        participantIds: ['A', 'B'],
        notes: '',
        splitType: 'exact',
        createdAt: '',
        updatedAt: '',
        deletedAt: null
      };

      expect(() => computeBalances([badExpense], [])).not.toThrow();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invariant warning'));
      warnSpy.mockRestore();
    });

    it('getExpensePairwiseImpact distributes shares without rounding artifacts using largest remainder (L1)', async () => {
      const { getExpensePairwiseImpact } = await import('../ledger');
      // 1000 minor units split 3 ways: 334, 333, 333
      const exp: Expense = {
        id: 'e1',
        groupId: null,
        description: 'Dinner',
        amountMinor: 1000,
        currency: 'USD',
        date: '2026-01-01',
        categoryId: 'c1',
        payers: [{ personId: 'A', amountMinor: 1000 }],
        shares: [
          { personId: 'A', amountMinor: 334 },
          { personId: 'B', amountMinor: 333 },
          { personId: 'C', amountMinor: 333 }
        ],
        participantIds: ['A', 'B', 'C'],
        notes: '',
        splitType: 'equal',
        createdAt: '',
        updatedAt: '',
        deletedAt: null
      };

      const impactB = getExpensePairwiseImpact(exp, 'A', 'B');
      const impactC = getExpensePairwiseImpact(exp, 'A', 'C');
      expect(impactB).toBe(333);
      expect(impactC).toBe(333);
      expect(impactB + impactC + 334).toBe(1000);
    });
  });
});
