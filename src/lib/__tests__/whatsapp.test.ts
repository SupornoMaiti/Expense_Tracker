import { describe, it, expect } from 'vitest';

export function buildWhatsAppUrl(phone: string, text: string) {
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

describe('whatsapp url building', () => {
  it('builds URL exactly as https://wa.me/<digits>?text=<encoded>', () => {
    const url = buildWhatsAppUrl('+91 98765-43210', 'Hello & welcome! You owe #500 or 100%. \n Please pay 😊.');
    expect(url).toBe('https://wa.me/919876543210?text=Hello%20%26%20welcome!%20You%20owe%20%23500%20or%20100%25.%20%0A%20Please%20pay%20%F0%9F%98%8A.');
  });
});
