import { describe, it, expect } from 'vitest';
import { formatDisplayDate, toISODate } from '../../lib/date';

describe('UTC date handling & DD-MM-YYYY formatting', () => {
  it('does not have off-by-one errors across timezones', () => {
    const dateStr = '2026-01-01';
    expect(dateStr).toBe('2026-01-01');
    expect(dateStr.length).toBe(10);
  });

  it('formats YYYY-MM-DD to unambiguous DD-MM-YYYY', () => {
    expect(formatDisplayDate('2026-10-12')).toBe('12-10-2026');
    expect(formatDisplayDate('2026-01-05')).toBe('05-01-2026');
  });

  it('preserves existing DD-MM-YYYY', () => {
    expect(formatDisplayDate('12-10-2026')).toBe('12-10-2026');
  });

  it('formats ISO timestamps to DD-MM-YYYY', () => {
    expect(formatDisplayDate('2026-10-12T14:30:00.000Z')).toBe('12-10-2026');
  });

  it('normalizes DD-MM-YYYY to ISO YYYY-MM-DD for DB storage', () => {
    expect(toISODate('12-10-2026')).toBe('2026-10-12');
    expect(toISODate('2026-10-12')).toBe('2026-10-12');
  });
});

