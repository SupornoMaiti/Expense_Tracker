import { describe, it, expect } from 'vitest';
import { calculateShares } from '../allocation';

describe('calculateShares', () => {
  it('splits exactly among 3 equal parts (100 -> 34, 33, 33)', () => {
    const participants = [
      { personId: 'a' },
      { personId: 'b' },
      { personId: 'c' },
    ];
    
    // total 100 minor units
    const shares = calculateShares(100, 'equal', participants);
    
    // Ordered by remainder then stable personId. 100/3 = 33.3333...
    // All remainders are equal initially. Lexicographical order: a gets the extra 1.
    expect(shares).toEqual([
      { personId: 'a', amountMinor: 34, rawValue: undefined },
      { personId: 'b', amountMinor: 33, rawValue: undefined },
      { personId: 'c', amountMinor: 33, rawValue: undefined },
    ]);
  });

  it('splits 1 paisa among 3 people', () => {
    const participants = [
      { personId: 'p1' },
      { personId: 'p2' },
      { personId: 'p3' },
    ];
    
    const shares = calculateShares(1, 'equal', participants);
    
    expect(shares).toEqual([
      { personId: 'p1', amountMinor: 1, rawValue: undefined },
      { personId: 'p2', amountMinor: 0, rawValue: undefined },
      { personId: 'p3', amountMinor: 0, rawValue: undefined },
    ]);
  });

  it('calculates percentage accurately and assigns remainders', () => {
    const participants = [
      { personId: 'Alice', rawValue: 33.33 },
      { personId: 'Bob', rawValue: 33.33 },
      { personId: 'Charlie', rawValue: 33.34 },
    ];
    
    // 1000 minor units = 10.00
    const shares = calculateShares(1000, 'percentage', participants);
    
    expect(shares).toEqual([
      { personId: 'Alice', amountMinor: 333, rawValue: 33.33 },
      { personId: 'Bob', amountMinor: 333, rawValue: 33.33 },
      { personId: 'Charlie', amountMinor: 334, rawValue: 33.34 },
    ]);
    
    const sum = shares.reduce((acc, s) => acc + s.amountMinor, 0);
    expect(sum).toBe(1000);
  });

  it('throws on exact split if total does not match', () => {
    const participants = [
      { personId: 'a', rawValue: 50 },
      { personId: 'b', rawValue: 60 },
    ];
    
    expect(() => calculateShares(100, 'exact', participants)).toThrowError();
  });

  it('accepts exact splits that match exactly', () => {
    const participants = [
      { personId: 'a', rawValue: 50 },
      { personId: 'b', rawValue: 50 },
    ];
    
    const shares = calculateShares(100, 'exact', participants);
    expect(shares).toEqual([
      { personId: 'a', amountMinor: 50, rawValue: 50 },
      { personId: 'b', amountMinor: 50, rawValue: 50 },
    ]);
  });

  it('splits using shares accurately', () => {
    const participants = [
      { personId: 'a', rawValue: 1 },
      { personId: 'b', rawValue: 2 },
    ];
    
    const shares = calculateShares(100, 'shares', participants);
    // a = 33.33 -> 33, b = 66.66 -> 67. b has remainder 0.66, a has 0.33
    // b gets remainder.
    expect(shares.find(s => s.personId === 'a')?.amountMinor).toBe(33);
    expect(shares.find(s => s.personId === 'b')?.amountMinor).toBe(67);
  });
});
