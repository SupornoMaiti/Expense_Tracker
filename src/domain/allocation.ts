import type { ExpenseShare, SplitType } from './types';

interface AllocationInput {
  personId: string;
  rawValue?: number; // Depending on split type (e.g. percentage or shares)
}

/**
 * Distributes an exact total (in minor units) according to the largest remainder method,
 * ensuring the sum of all allocated amounts exactly equals the totalAmountMinor.
 * 
 * Ties are broken consistently using the lexicographical order of personId.
 */
export function allocateLargestRemainder(
  totalAmountMinor: number,
  participants: AllocationInput[],
  weights: number[] // must correspond 1:1 with participants
): ExpenseShare[] {
  if (participants.length === 0) return [];
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    throw new Error('Total weight must be greater than 0');
  }

  // Calculate proportional amounts and remainders
  const allocations = participants.map((p, index) => {
    const proportion = totalAmountMinor * (weights[index] / totalWeight);
    const floorAmount = Math.floor(proportion);
    const remainder = proportion - floorAmount;
    
    return {
      personId: p.personId,
      rawValue: p.rawValue,
      floorAmount,
      remainder,
      amountMinor: floorAmount, // initial assignment
    };
  });

  const sumFloor = allocations.reduce((sum, a) => sum + a.floorAmount, 0);
  const difference = totalAmountMinor - sumFloor;

  // Sort by remainder descending, then personId ascending to break ties
  allocations.sort((a, b) => {
    // If difference > 0, we want largest remainders first
    if (a.remainder !== b.remainder) {
      return b.remainder - a.remainder;
    }
    // Stable tie-breaking
    return a.personId.localeCompare(b.personId);
  });

  // Distribute the remaining minor units
  for (let i = 0; i < difference; i++) {
    allocations[i].amountMinor += 1;
  }

  // Return to original order by returning exactly what was passed in but mapping to shares
  // Actually, returning a new array is fine, we don't strictly need original order
  // but it's nice to sort by personId for consistency.
  allocations.sort((a, b) => a.personId.localeCompare(b.personId));

  return allocations.map(a => ({
    personId: a.personId,
    amountMinor: a.amountMinor,
    rawValue: a.rawValue
  }));
}

export function calculateShares(
  totalAmountMinor: number,
  splitType: SplitType,
  participants: AllocationInput[] // Person ID and optional rawValue (percentage, share count, or exact amount)
): ExpenseShare[] {
  if (participants.length === 0) return [];

  switch (splitType) {
    case 'equal': {
      const weights = participants.map(() => 1);
      return allocateLargestRemainder(totalAmountMinor, participants, weights);
    }
    
    case 'exact': {
      const shares = participants.map(p => ({
        personId: p.personId,
        amountMinor: Math.round(p.rawValue || 0), // rawValue is the exact amount here
        rawValue: p.rawValue
      }));
      const sum = shares.reduce((acc, s) => acc + s.amountMinor, 0);
      if (sum !== totalAmountMinor) {
        throw new Error('Exact splits must sum to the total amount');
      }
      return shares;
    }

    case 'percentage': {
      // For percentages, rawValue is the percentage (e.g., 33.33)
      const weights = participants.map(p => p.rawValue || 0);
      const totalPercentage = weights.reduce((sum, w) => sum + w, 0);
      // Allow a tiny margin for JS float issues, e.g. 99.99999... or 100.000...1
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Percentages must sum to 100');
      }
      return allocateLargestRemainder(totalAmountMinor, participants, weights);
    }

    case 'shares': {
      // For shares, rawValue is the number of shares (e.g. 1, 2, 3)
      const weights = participants.map(p => p.rawValue || 0);
      return allocateLargestRemainder(totalAmountMinor, participants, weights);
    }

    default:
      throw new Error(`Unsupported split type: ${splitType}`);
  }
}
