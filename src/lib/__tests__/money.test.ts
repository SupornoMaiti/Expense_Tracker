import { describe, it, expect } from 'vitest';
import { formatMoney, parseDecimalToMinor } from '../money';
import { getWhatsAppLink } from '../whatsapp';
import type { Person } from '../../domain/types';

describe('formatMoney', () => {
  it('formats exactly 0', () => {
    expect(formatMoney(0, 'INR')).toBe('₹0.00');
  });

  describe('parseDecimalToMinor', () => {
    it('rejects inputs with more than two decimal places', () => {
      expect(parseDecimalToMinor('1.999')).toBeNaN();
    });
  });
  
  it('formats 1 minor unit', () => {
    expect(formatMoney(1, 'INR')).toBe('₹0.01');
  });
  
  it('formats 99 minor units', () => {
    expect(formatMoney(99, 'INR')).toBe('₹0.99');
  });
  
  it('formats 100 minor units', () => {
    expect(formatMoney(100, 'INR')).toBe('₹1.00');
  });
  
  it('formats 10000000 minor units as 1,00,000.00', () => {
    // 1 lakh = 100000.00 = 10000000 minor units
    expect(formatMoney(10000000, 'INR')).toBe('₹1,00,000.00');
  });
  
  it('formats negative amounts', () => {
    expect(formatMoney(-500, 'INR')).toBe('-₹5.00');
  });
  
  it('formats non-INR currency', () => {
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56');
  });

  it('formats large non-INR currency with standard 3-digit grouping', () => {
    expect(formatMoney(10000000, 'USD')).toBe('$100,000.00');
  });

  it('WhatsApp amount string equals on-screen string', () => {
    const formatted = formatMoney(50000, 'INR');
    expect(formatted).toBe('₹500.00');
        // Mock person and settings
    const person: Person = {
      id: 'p1',
      name: 'John',
      phone: '+919876543210',
      avatarColor: '#000000',
      source: 'manual',
      isMe: false,
      createdAt: '',
      updatedAt: '',
      archivedAt: null,
      deletedAt: null
    };
    
    const url = getWhatsAppLink(formatted, person.phone);
    expect(url).toContain(encodeURIComponent(formatted));
  });
});
