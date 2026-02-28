import { describe, expect, it } from 'vitest';
import { calculateCombinationCost, generateCombinations } from './optimizer';
import type { CandidateSkill } from './types';

type CandidateWithNet = CandidateSkill & { netCost: number };

function createCandidate(
  skillId: string,
  cost: number,
  netCost: number,
): CandidateWithNet {
  return {
    skillId,
    cost,
    netCost,
    hintLevel: 5,
    isStackable: false,
    isGold: false,
  };
}

describe('optimizer net cost usage', () => {
  it('generateCombinations uses net cost for budget checks', () => {
    const candidates: Array<CandidateWithNet> = [
      createCandidate('skill-a', 170, 90),
      createCandidate('skill-b', 150, 95),
    ];

    const combinations = generateCombinations(candidates, 100);

    expect(combinations).toContainEqual(['skill-a']);
    expect(combinations).toContainEqual(['skill-b']);
    expect(combinations).not.toContainEqual(['skill-a', 'skill-b']);
  });

  it('calculateCombinationCost sums net costs (not gross costs)', () => {
    const candidates: Array<CandidateWithNet> = [
      createCandidate('skill-a', 170, 90),
      createCandidate('skill-b', 150, 95),
    ];

    const total = calculateCombinationCost(['skill-a', 'skill-b'], candidates);

    expect(total).toBe(185);
  });
});
