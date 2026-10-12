import type { Person, Settings, Reminder, Expense, Settlement } from '../domain/types';
import { formatMoney } from './money';
import { getExpensePairwiseImpact } from '../domain/ledger';
import { generateId } from './utils';

export function formatWhatsAppDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let year = '';
  let month = '';
  let day = '';

  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else if (parts[2].length === 4) {
      // DD-MM-YYYY
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
  }

  if (year && month && day) {
    const mIdx = parseInt(month, 10) - 1;
    const mName = months[mIdx] || month;
    const dNum = parseInt(day, 10);
    const yShort = year.slice(-2);
    return `${dNum} ${mName} ${yShort}`;
  }

  return dateStr;
}

export function buildReminderMessage(
  friend: Person,
  myId: string,
  expenses: Expense[],
  settlements: Settlement[],
  settings: Settings,
  currency: string
): { message: string, totalPending: number } | null {
  const entries: (Expense | Settlement)[] = [...expenses, ...settlements].filter(e => e.currency === currency && !e.deletedAt);
  
  entries.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.createdAt.localeCompare(b.createdAt);
  });

  let oldOwed = 0;
  let activeLines: { date: string, createdAt: string, desc: string, amountMinor: number }[] = [];
  let resetOnNext = false;

  for (const entry of entries) {
    if (resetOnNext) {
      activeLines = [];
      resetOnNext = false;
    }

    let impact = 0;
    if ('method' in entry) {
      if (entry.fromId === friend.id && entry.toId === myId) {
        impact = -entry.amountMinor;
      } else if (entry.fromId === myId && entry.toId === friend.id) {
        impact = entry.amountMinor;
      }
    } else {
      impact = getExpensePairwiseImpact(entry, myId, friend.id);
    }

    const newOwed = oldOwed + impact;
    
    if (impact !== 0) {
      let desc: string;
      if ('method' in entry) {
        desc = impact < 0 ? 'Payment received' : 'Payment made';
        if (entry.notes) desc += ` (${entry.notes})`;
      } else {
        desc = entry.description;
      }
      
      desc = desc.replace(/\s+/g, ' ').trim();
      if (desc.length > 40) desc = desc.slice(0, 37) + '...';

      activeLines.push({
        date: entry.date,
        createdAt: entry.createdAt,
        desc,
        amountMinor: impact
      });
    }

    oldOwed = newOwed;

    if (newOwed === 0) {
      resetOnNext = true;
    }
  }

  const finalOwed = oldOwed;

  const groups = new Map<string, typeof activeLines>();
  for (const line of activeLines) {
    if (!groups.has(line.date)) groups.set(line.date, []);
    groups.get(line.date)!.push(line);
  }

  const dateKeys = Array.from(groups.keys());
  let breakdown = '';
  let droppedCount = 0;

  const blocks: string[] = [];
  let currentLength = 0;
  for (let i = dateKeys.length - 1; i >= 0; i--) {
    const d = dateKeys[i];
    const lines = groups.get(d)!;
    
    let block = `---${formatWhatsAppDate(d)}---`;
    for (const l of lines) {
      const sign = l.amountMinor > 0 ? '+' : '-';
      const formattedAmt = formatMoney(Math.abs(l.amountMinor), currency);
      block += `\n${sign}${formattedAmt} [${l.desc}]`;
    }
    
    if (currentLength + block.length > 1300 && blocks.length > 0) {
      droppedCount += lines.length;
      for (let j = i - 1; j >= 0; j--) droppedCount += groups.get(dateKeys[j])!.length;
      break;
    } else {
      blocks.unshift(block);
      currentLength += block.length;
    }
  }

  if (droppedCount > 0) {
    breakdown = `...and ${droppedCount} earlier entries\n\n`;
  }
  breakdown += blocks.join('\n').trim();

  let totalSummary: string;
  if (finalOwed > 0) {
    totalSummary = `You owe me ${formatMoney(finalOwed, currency)}`;
  } else if (finalOwed < 0) {
    totalSummary = `I owe you ${formatMoney(Math.abs(finalOwed), currency)}`;
  } else {
    totalSummary = `All settled up (${formatMoney(0, currency)})`;
  }

  let tmpl = settings.whatsappTemplate || 'Hi {name}, here is our balance breakdown:\n\n{breakdown}\n\nTotal: {amount}';
  tmpl = tmpl.replace('Total pending: {amount}', 'Total: {amount}');

  let message = tmpl
    .replace('{name}', friend.name)
    .replace('{amount}', totalSummary)
    .replace('{total}', totalSummary)
    .replace('{status}', totalSummary)
    .replace('{net_total}', totalSummary)
    .replace('{currency}', currency)
    .replace('{breakdown}', breakdown);
    
  message = message.replace(/\{[^}]+\}/g, '');

  return { message, totalPending: finalOwed };
}

export function getWhatsAppLink(message: string, phone: string | null) {
  if (!phone) return null;
  const phoneDigits = phone.replace(/\D/g, '');
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsAppReminder(
  friend: Person,
  myId: string,
  expenses: Expense[],
  settlements: Settlement[],
  settings: Settings,
  deps: {
    openLink: (url: string) => void;
    askSent: () => Promise<boolean> | boolean;
    logReminder: (reminder: Reminder) => Promise<void>;
    now: () => string;
  }
): Promise<boolean> {
  const result = buildReminderMessage(friend, myId, expenses, settlements, settings, settings.defaultCurrency);
  if (!result) return false;

  const waLink = getWhatsAppLink(result.message, friend.phone);
  if (!waLink) return false;

  deps.openLink(waLink);

  const confirmed = await deps.askSent();
  if (!confirmed) return false;

  await deps.logReminder({
    id: generateId(),
    personId: friend.id,
    groupId: null,
    amountMinor: result.totalPending,
    currency: settings.defaultCurrency,
    messageSnapshot: result.message,
    sentAt: deps.now(),
  });
  return true;
}
