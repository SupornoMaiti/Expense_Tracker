import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getActiveExpenses, getActiveSettlements, getActivePeople } from '../db/repositories';
import { computePairwiseBalance, getExpensePairwiseImpact } from '../domain/ledger';
import type { Expense } from '../domain/types';
import { toISODate } from '../lib/date';

export function usePersonDetailData(friendId?: string) {
  const person = useLiveQuery(() => friendId ? db.people.get(friendId) : undefined, [friendId]);
  const me = useLiveQuery(() => db.people.filter(p => p.isMe).first());
  const allPeople = useLiveQuery(() => getActivePeople()) || [];
  const expenses = useLiveQuery(() => getActiveExpenses());
  const settlements = useLiveQuery(() => getActiveSettlements());
  const settingsArray = useLiveQuery(() => db.settings.toArray());

  const isLoading =
    person === undefined ||
    me === undefined ||
    expenses === undefined ||
    settlements === undefined ||
    settingsArray === undefined;

  if (isLoading || !person || !me || !expenses || !settlements || !settingsArray) {
    return {
      isLoading,
      person,
      me,
      allPeople,
      expenses: expenses || [],
      settlements: settlements || [],
      settings: settingsArray?.[0],
      currency: 'INR',
      myId: me?.id || '',
      sharedExpenses: [],
      sharedSettlements: [],
      netBalance: 0,
      isOwed: false,
      isOwing: false,
      totalTheyOweMeFromExpenses: 0,
      totalIOweThemFromExpenses: 0,
      totalIPaidInSettlements: 0,
      totalTheyPaidInSettlements: 0,
      totalSettledAmount: 0,
      amountToBeSettled: 0,
      activeSettlementsCount: 0,
    };
  }

  const settings = settingsArray[0];
  const currency = settings?.defaultCurrency || 'INR';
  const myId = me.id;

  const isPersonInExpense = (exp: Expense, pId: string) => {
    return (
      (exp.participantIds && exp.participantIds.includes(pId)) ||
      (exp.payers && exp.payers.some(p => p.personId === pId)) ||
      (exp.shares && exp.shares.some(s => s.personId === pId))
    );
  };

  const sharedExpenses = expenses.filter(e => {
    const pairwiseImpact = getExpensePairwiseImpact(e, myId, friendId!);
    if (pairwiseImpact !== 0) return true;
    return isPersonInExpense(e, myId) && isPersonInExpense(e, friendId!);
  });

  const sharedSettlements = settlements.filter(s =>
    (s.fromId === myId && s.toId === friendId) ||
    (s.fromId === friendId && s.toId === myId)
  );

  const netBalance = computePairwiseBalance(expenses, settlements, myId, friendId!, currency);
  const isOwed = netBalance > 0;
  const isOwing = netBalance < 0;

  const currencySettlements = sharedSettlements.filter(s => s.currency === currency && !s.deletedAt);

  let totalTheyOweMeFromExpenses = 0;
  let totalIOweThemFromExpenses = 0;

  if (currencySettlements.length === 0) {
    // No settlements recorded yet: all shared expenses in this currency are active
    for (const exp of sharedExpenses) {
      if (exp.currency !== currency || exp.deletedAt) continue;
      const impact = getExpensePairwiseImpact(exp, myId, friendId!);
      if (impact > 0) {
        totalTheyOweMeFromExpenses += impact;
      } else if (impact < 0) {
        totalIOweThemFromExpenses += Math.abs(impact);
      }
    }
  } else {
    // Settlements exist: find the most recent settlement
    const sortedSettlements = [...currencySettlements].sort((a, b) => {
      const dComp = toISODate(a.date).localeCompare(toISODate(b.date));
      if (dComp !== 0) return dComp;
      return a.createdAt.localeCompare(b.createdAt);
    });
    const lastSettlement = sortedSettlements[sortedSettlements.length - 1];

    if (netBalance === 0) {
      // Balance is fully settled: all three tabs reset to 0
      totalTheyOweMeFromExpenses = 0;
      totalIOweThemFromExpenses = 0;
    } else {
      // Determine which expenses occurred after the latest settlement
      const isAfterLastSettlement = (exp: Expense) => {
        const expDate = toISODate(exp.date);
        const setDate = toISODate(lastSettlement.date);
        if (expDate > setDate) return true;
        if (expDate < setDate) return false;
        return exp.createdAt > lastSettlement.createdAt;
      };

      const cycleExpenses = sharedExpenses.filter(
        exp => exp.currency === currency && !exp.deletedAt && isAfterLastSettlement(exp)
      );

      let cycleTheyOweMe = 0;
      let cycleIOweThem = 0;
      for (const exp of cycleExpenses) {
        const impact = getExpensePairwiseImpact(exp, myId, friendId!);
        if (impact > 0) cycleTheyOweMe += impact;
        else if (impact < 0) cycleIOweThem += Math.abs(impact);
      }

      if (cycleTheyOweMe > 0 || cycleIOweThem > 0) {
        totalTheyOweMeFromExpenses = cycleTheyOweMe;
        totalIOweThemFromExpenses = cycleIOweThem;
      } else {
        // No new expenses created yet after settlement, but balance remains (e.g. partial settlement)
        if (netBalance > 0) {
          totalTheyOweMeFromExpenses = netBalance;
          totalIOweThemFromExpenses = 0;
        } else {
          totalTheyOweMeFromExpenses = 0;
          totalIOweThemFromExpenses = Math.abs(netBalance);
        }
      }
    }
  }

  let totalIPaidInSettlements = 0;
  let totalTheyPaidInSettlements = 0;
  for (const st of currencySettlements) {
    if (st.fromId === myId && st.toId === friendId) {
      totalIPaidInSettlements += st.amountMinor;
    } else if (st.fromId === friendId && st.toId === myId) {
      totalTheyPaidInSettlements += st.amountMinor;
    }
  }
  const totalSettledAmount = totalIPaidInSettlements + totalTheyPaidInSettlements;
  const amountToBeSettled = Math.abs(netBalance);

  return {
    isLoading: false,
    person,
    me,
    allPeople,
    expenses,
    settlements,
    settings,
    currency,
    myId,
    sharedExpenses,
    sharedSettlements,
    netBalance,
    isOwed,
    isOwing,
    totalTheyOweMeFromExpenses,
    totalIOweThemFromExpenses,
    totalIPaidInSettlements,
    totalTheyPaidInSettlements,
    totalSettledAmount,
    amountToBeSettled,
    activeSettlementsCount: currencySettlements.length,
  };
}
