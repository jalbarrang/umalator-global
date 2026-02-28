import { describe, expect, it } from 'vitest';
import { calculateSkillCost, getNetCost } from './cost-calculator';
import type { CandidateSkill } from './types';
import { getSkillById } from '@/modules/skills/utils';
import { runawaySkillId } from '@/modules/runners/components/runner-card/types';

describe('cost-calculator', () => {
  const skillId = runawaySkillId;
  const baseCost = getSkillById(skillId).baseCost;

  it('applies hint discount levels from 0 to 5', () => {
    expect(calculateSkillCost(skillId, 0, false)).toBe(baseCost);
    expect(calculateSkillCost(skillId, 1, false)).toBe(Math.floor(baseCost * 0.9));
    expect(calculateSkillCost(skillId, 2, false)).toBe(Math.floor(baseCost * 0.8));
    expect(calculateSkillCost(skillId, 3, false)).toBe(Math.floor(baseCost * 0.7));
    expect(calculateSkillCost(skillId, 4, false)).toBe(Math.floor(baseCost * 0.65));
    expect(calculateSkillCost(skillId, 5, false)).toBe(Math.floor(baseCost * 0.6));
  });

  it('applies Fast Learner discount when no hint exists', () => {
    expect(calculateSkillCost(skillId, 0, true)).toBe(Math.floor(baseCost * 0.9));
  });

  it('stacks hint and Fast Learner discounts in order', () => {
    expect(calculateSkillCost(skillId, 5, true)).toBe(Math.floor(baseCost * 0.6 * 0.9));
    expect(calculateSkillCost(skillId, 3, true)).toBe(Math.floor(baseCost * 0.7 * 0.9));
  });

  it('getNetCost computes discounted cost from candidate data', () => {
    const candidate: CandidateSkill = {
      skillId,
      cost: baseCost,
      netCost: baseCost,
      hintLevel: 5,
      isStackable: false,
      isGold: false,
    };

    expect(getNetCost(candidate, false)).toBe(Math.floor(baseCost * 0.6));
    expect(getNetCost(candidate, true)).toBe(Math.floor(baseCost * 0.6 * 0.9));
  });
});
