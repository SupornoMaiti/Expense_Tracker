import { describe, it, expect } from 'vitest';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentVal = "";
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i+1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal);
  return result;
}

function preventFormulaInjection(val: string): string {
  if (val.startsWith("'=")) return val; // already escaped
  if (val.startsWith("'+")) return val;
  if (val.startsWith("'-")) return val;
  if (val.startsWith("'@")) return val;
  
  if (val.startsWith('=') || val.startsWith('+') || val.startsWith('-') || val.startsWith('@')) {
    return "'" + val;
  }
  return val;
}

describe('CSV and parsing logic', () => {
  it('parses CSV with commas and quotes inside fields', () => {
    const line = `John,"Doe, Jr.",12345,"He said ""Hello"""`;
    const fields = parseCSVLine(line);
    expect(fields).toEqual(['John', 'Doe, Jr.', '12345', 'He said "Hello"']);
  });
  
  it('protects against formula injection in exports and is idempotent', () => {
    // Escaping
    expect(preventFormulaInjection('=1+2')).toBe("'=1+2");
    expect(preventFormulaInjection('+cmd|/c')).toBe("'+cmd|/c");
    expect(preventFormulaInjection('-100')).toBe("'-100");
    expect(preventFormulaInjection('@sum')).toBe("'@sum");
    expect(preventFormulaInjection('Normal string')).toBe("Normal string");

    // Idempotent (if already escaped, don't escape again)
    expect(preventFormulaInjection("'=1+2")).toBe("'=1+2");
  });
});
