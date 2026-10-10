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
    if (sum !== 0) {
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

/**
 * Computes the pairwise net balance between Person A and Person B for a given currency.
 * Positive return value means Person B owes Person A (Person A is owed).
 * Negative return value means Person A owes Person B (Person A owes).
 * Zero return value means they are settled up.
 */
export function computePairwiseBalance(
  expenses: Expense[],
  settlements: Settlement[],
  personAId: string,
  personBId: string,
  currency: string
): number {
  let netMinor = 0;

  for (const exp of expenses) {
    if (exp.deletedAt || exp.currency !== currency) continue;
    netMinor += getExpensePairwiseImpact(exp, personAId, personBId);
  }

  for (const st of settlements) {
    if (st.deletedAt || st.currency !== currency) continue;

    // Person B paid Person A directly: reduces what B owes A
    if (st.fromId === personBId && st.toId === personAId) {
      netMinor -= st.amountMinor;
    }

    // Person A paid Person B directly: reduces what A owes B (increases what B owes A)
    if (st.fromId === personAId && st.toId === personBId) {
      netMinor += st.amountMinor;
    }
  }

  return netMinor;
}

/**
 * Returns how much Person B owes Person A as a result of this specific expense.
 * Positive: Person B owes Person A.
 * Negative: Person A owes Person B.
 */
export function getExpensePairwiseImpact(exp: Expense, personAId: string, personBId: string): number {
  if (exp.deletedAt) return 0;
  const totalAmount = exp.amountMinor;
  if (totalAmount <= 0) return 0;

  const paidByA = exp.payers
    .filter(p => p.personId === personAId)
    .reduce((sum, p) => sum + p.amountMinor, 0);

  const paidByB = exp.payers
    .filter(p => p.personId === personBId)
    .reduce((sum, p) => sum + p.amountMinor, 0);

  const shareOfA = exp.shares
    .filter(s => s.personId === personAId)
    .reduce((sum, s) => sum + s.amountMinor, 0);

  const shareOfB = exp.shares
    .filter(s => s.personId === personBId)
    .reduce((sum, s) => sum + s.amountMinor, 0);

  let impact = 0;
  if (paidByA > 0 && shareOfB > 0) {
    impact += Math.round((paidByA * shareOfB) / totalAmount);
  }
  if (paidByB > 0 && shareOfA > 0) {
    impact -= Math.round((paidByB * shareOfA) / totalAmount);
  }
  return impact;
}
