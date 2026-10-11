/**
 * Date utility functions for consistent DD-MM-YYYY presentation across SplitLocal.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Returns today's date formatted as YYYY-MM-DD in local time.
 */
export function getTodayISODate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats any date string (YYYY-MM-DD, DD-MM-YYYY, or ISO timestamp)
 * into unambiguous DD-MM-YYYY format.
 */
export function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '';

  const clean = dateStr.trim();
  if (!clean) return '';

  // If already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    return clean;
  }

  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}-${m}-${y}`;
  }

  // If YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('/');
    return `${d}-${m}-${y}`;
  }

  // If DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${d}-${m}-${y}`;
  }

  // If ISO string like 2026-10-12T10:00:00.000Z
  if (clean.includes('T')) {
    const datePart = clean.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, d] = datePart.split('-');
      return `${d}-${m}-${y}`;
    }
  }

  // Fallback parsing
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = (parsed.getMonth() + 1).toString().padStart(2, '0');
    const d = parsed.getDate().toString().padStart(2, '0');
    return `${d}-${m}-${y}`;
  }

  return clean;
}

/**
 * Normalizes any date string into standard ISO YYYY-MM-DD for database storage.
 */
export function toISODate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return getTodayISODate();

  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  if (/^\d{2}-\d{2}-\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('-');
    return `${y}-${m}-${d}`;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('/');
    return `${y}-${m}-${d}`;
  }

  return clean;
}

export { MONTH_NAMES, MONTH_SHORT };
