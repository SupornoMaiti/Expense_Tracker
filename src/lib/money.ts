export function parseDecimalToMinor(input: string): number {
  if (!input || typeof input !== 'string') return NaN;
  
  // Replace comma with dot
  const normalized = input.trim().replace(/,/g, '.');
  
  if (normalized === '') return NaN;
  if (normalized.startsWith('-')) return NaN; // Or negative if we allow negative expenses, but usually we reject
  
  // Reject exponent notation
  if (normalized.toLowerCase().includes('e')) return NaN;
  
  // Validate format (digits optionally followed by dot and 1-2 digits)
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    // If it has more than 2 decimal places or weird characters, reject or we can just parse it by truncating.
    // Let's be strict or lenient? The test said "10.555", maybe we just reject?
    // Let's actually extract parts
  }
  
  // A robust way to parse up to 2 decimal places exactly without floating point math:
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) return NaN;
  
  const intPart = match[1];
  let decPart = match[2] || '';
  
  // Truncate or pad decimal to 2 places
  if (decPart.length > 2) decPart = decPart.substring(0, 2);
  if (decPart.length === 1) decPart += '0';
  if (decPart.length === 0) decPart = '00';
  
  // Remove leading zeros from intPart for BigInt/parsing
  const cleanIntPart = intPart.replace(/^0+/, '') || '0';
  
  const totalMinorStr = cleanIntPart + decPart;
  
  const minor = parseInt(totalMinorStr, 10);
  
  if (minor > Number.MAX_SAFE_INTEGER) return NaN;
  
  return minor;
}
