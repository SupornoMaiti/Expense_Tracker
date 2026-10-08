import type { Person, Settings, Reminder } from '../domain/types';
import { formatMoney } from './money';


export function getWhatsAppLink(
  person: Person,
  amountMinor: number,
  currency: string,
  settings: Settings,
  groupName?: string
) {
  if (!person.phone) return null;
  
  // digits only E.164
  const phoneDigits = person.phone.replace(/\D/g, '');
  
  const amountStr = formatMoney(amountMinor, currency);
  
  // replace variables
  const message = settings.whatsappTemplate
    .replace('{name}', person.name)
    .replace('{amount}', amountStr)
    .replace('{currency}', currency)
    .replace('{group}', groupName || 'our expenses')
    .replace('{breakdown}', 'You can view the full breakdown in the app.'); // Simplify for now

  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`;
}

export async function sendWhatsAppReminder(
  friend: Person,
  netBalance: number,
  settings: Settings,
  deps: {
    openLink: (url: string) => void;
    askSent: () => Promise<boolean> | boolean;
    logReminder: (reminder: Reminder) => Promise<void>;
    now: () => string;
  }
): Promise<boolean> {
  if (netBalance <= 0) return false;

  const waLink = getWhatsAppLink(friend, netBalance, settings.defaultCurrency, settings);
  if (!waLink) return false;

  deps.openLink(waLink);

  const didSend = await deps.askSent();
  if (didSend) {
    await deps.logReminder({
      id: crypto.randomUUID(),
      personId: friend.id,
      groupId: null,
      amountMinor: netBalance,
      currency: settings.defaultCurrency,
      messageSnapshot: `You owe ${formatMoney(netBalance, settings.defaultCurrency)}`,
      sentAt: deps.now(),
    });
    return true;
  }
  return false;
}
