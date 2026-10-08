import type { Person, Settings } from '../domain/types';
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
