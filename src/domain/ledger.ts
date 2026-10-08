import type { Expense, Settlement } from './types';

export interface Balance {
  personId: string;
  currency: string;
  netAmountMinor: number; // positive = owed money, negative = owes money
}

// Representing how much A owes B
export interface Debt {
  fromId: string; // The person who owes
  toId: string;   // The person who is owed
  amountMinor: number;
  currency: string;
}

export function computeBalances(expenses: Expense[], settlements: Settlement[]): Balance[] {
  // We compute balances per person, per currency.
  // We'll use a map structure: Map<currency, Map<personId, number>>
  const currencyMaps = new Map<string, Map<string, number>>();



  const addBalance = (currency: string, personId: string, amount: number) => {
    if (!currencyMaps.has(currency)) {
      currencyMaps.set(currency, new Map());
    }
    const map = currencyMaps.get(currency)!;
    const current = map.get(personId) || 0;
    map.set(personId, current + amount);
  };

  for (const exp of expenses) {
    if (exp.deletedAt) continue; // safety check, though we should only pass active expenses

    // Payers add to their balance (they paid, so they are owed money)
    for (const payer of exp.payers) {
      addBalance(exp.currency, payer.personId, payer.amountMinor);
    }

    // Shares subtract from their balance (they consumed, so they owe money)
    for (const share of exp.shares) {
      addBalance(exp.currency, share.personId, -share.amountMinor);
    }
  }

  for (const st of settlements) {
    if (st.deletedAt) continue;

    // fromId paid money to toId.
    // fromId's balance increases (they owe less / are owed more)
    addBalance(st.currency, st.fromId, st.amountMinor);
    
    // toId received money.
    // toId's balance decreases (they are owed less)
    addBalance(st.currency, st.toId, -st.amountMinor);
  }

  const results: Balance[] = [];
  
  for (const [currency, map] of currencyMaps.entries()) {
    for (const [personId, amount] of map.entries()) {
      if (amount !== 0) {
        results.push({
          personId,
          currency,
          netAmountMinor: amount
        });
      }
    }
  }

  // Ensure invariants check
  for (const [currency, map] of currencyMaps.entries()) {
    let sum = 0;
    for (const amount of map.values()) {
      sum += amount;
    }
    if (Math.abs(sum) > 1e-9) { // Using a tiny tolerance just in case of any weird JS integer issues, though integers should be exact
      throw new Error(`Invariant failed: Sum of net balances for currency ${currency} is not zero. It is ${sum}.`);
    }
  }

  return results;
}

/**
 * Greedily simplifies debts to minimize the number of transactions.
 * Requires balances for a specific currency that sum to exactly 0.
 */
export function simplifyDebts(balances: Balance[], currency: string): Debt[] {
  const currencyBalances = balances.filter(b => b.currency === currency && b.netAmountMinor !== 0);
  
  const debtors = currencyBalances.filter(b => b.netAmountMinor < 0).map(b => ({ ...b, netAmountMinor: Math.abs(b.netAmountMinor) }));
  const creditors = currencyBalances.filter(b => b.netAmountMinor > 0).map(b => ({ ...b }));

  // Sort by amount descending to greedily settle largest debts first
  debtors.sort((a, b) => b.netAmountMinor - a.netAmountMinor);
  creditors.sort((a, b) => b.netAmountMinor - a.netAmountMinor);

  const debts: Debt[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.netAmountMinor, creditor.netAmountMinor);
    
    if (amount > 0) {
      debts.push({
        fromId: debtor.personId,
        toId: creditor.personId,
        amountMinor: amount,
        currency
      });
    }

    debtor.netAmountMinor -= amount;
    creditor.netAmountMinor -= amount;

    if (debtor.netAmountMinor === 0) d++;
    if (creditor.netAmountMinor === 0) c++;
  }

  return debts;
}
