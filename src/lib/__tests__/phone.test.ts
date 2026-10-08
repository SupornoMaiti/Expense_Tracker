import { describe, it, expect } from 'vitest';

export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/[^0-9+]/g, '');
  if (!digits) return null;
  
  let normalized = digits;
  if (normalized.startsWith('00')) {
    normalized = '+' + normalized.substring(2);
  } else if (normalized.startsWith('0') && normalized.length === 11) {
    normalized = '+91' + normalized.substring(1); // Assuming 0-prefix is domestic IN
  } else if (normalized.startsWith('91') && normalized.length === 12) {
    normalized = '+' + normalized;
  }
  
  if (!normalized.startsWith('+')) {
    // If it's a 10 digit number without +, assume India +91
    if (normalized.length === 10) {
      normalized = '+91' + normalized;
    } else {
      return null;
    }
  }

  // Basic length check for E.164 (usually max 15 digits)
  if (normalized.length < 10 || normalized.length > 15) {
    return null;
  }
  
  return normalized;
}

describe('phone normalization', () => {
  it('normalizes +91 numbers correctly', () => {
    expect(normalizePhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalizePhone('+91-98765-43210')).toBe('+919876543210');
    expect(normalizePhone('+91(987)654-3210')).toBe('+919876543210');
    expect(normalizePhone('919876543210')).toBe('+919876543210');
    expect(normalizePhone('09876543210')).toBe('+919876543210');
    expect(normalizePhone('9876543210')).toBe('+919876543210');
    expect(normalizePhone('00919876543210')).toBe('+919876543210');
  });

  it('rejects invalid numbers', () => {
    expect(normalizePhone('123')).toBe(null); // too short
    expect(normalizePhone('+9112345678901234567890')).toBe(null); // too long
    expect(normalizePhone('abcdefghij')).toBe(null); // letters
  });
});
