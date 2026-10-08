import type { Person, Settings } from '../domain/types';
import { formatMoney } from './money';
import { db } from '../db/db';

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
  settings: Settings
): Promise<boolean> {
  if (netBalance <= 0) return false;

  const waLink = getWhatsAppLink(friend, netBalance, settings.defaultCurrency, settings);
  if (!waLink) return false;

  window.open(waLink, '_blank', 'noopener,noreferrer');

  const didSend = window.confirm('Did you send the reminder on WhatsApp?');
  if (didSend) {
    const now = new Date().toISOString();
    await db.reminders.add({
      id: crypto.randomUUID(),
      personId: friend.id,
      groupId: null,
      amountMinor: netBalance,
      currency: settings.defaultCurrency,
      messageSnapshot: `You owe ${formatMoney(netBalance, settings.defaultCurrency)}`,
      sentAt: now,
    });
    return true;
  }
  return false;
}
