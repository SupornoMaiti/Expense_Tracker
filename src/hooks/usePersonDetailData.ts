import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getActiveExpenses, getActiveSettlements, getActivePeople } from '../db/repositories';
import { computePairwiseBalance, getExpensePairwiseImpact } from '../domain/ledger';
import type { Expense } from '../domain/types';

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

  let totalTheyOweMeFromExpenses = 0;
  let totalIOweThemFromExpenses = 0;
  let totalIPaidInSettlements = 0;
  let totalTheyPaidInSettlements = 0;

  for (const exp of sharedExpenses) {
    if (exp.currency !== currency) continue;
    const impact = getExpensePairwiseImpact(exp, myId, friendId!);
    if (impact > 0) {
      totalTheyOweMeFromExpenses += impact;
    } else if (impact < 0) {
      totalIOweThemFromExpenses += Math.abs(impact);
    }
  }

  for (const st of sharedSettlements) {
    if (st.currency !== currency) continue;
    if (st.fromId === myId && st.toId === friendId) {
      totalIPaidInSettlements += st.amountMinor;
    } else if (st.fromId === friendId && st.toId === myId) {
      totalTheyPaidInSettlements += st.amountMinor;
    }
  }

  const totalSettledAmount = totalIPaidInSettlements + totalTheyPaidInSettlements;

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
  };
}
