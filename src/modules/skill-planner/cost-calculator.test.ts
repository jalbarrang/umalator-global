import { describe, expect, it } from 'vitest';
import { calculateDisplayCost, calculateSkillCost, getNetCost } from './cost-calculator';
import type { CandidateSkill } from './types';
import { skillCollection } from '@/modules/data/skills';
import { runawaySkillId } from '@/modules/runners/components/runner-card/types';
import { getWhiteVersion } from '@/modules/skills/skill-relationships';

const getSkillIdByName = (name: string): string => {
  const skillId = Object.keys(skillCollection).find((candidateId) => skillCollection[candidateId].name === name);

  if (!skillId) {
    throw new Error(`Could not find skill named "${name}"`);
  }

  return skillId;
};

describe('cost-calculator', () => {
  const skillId = runawaySkillId;
  const baseCost = skillCollection[skillId].baseCost;

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

  it('does not bundle white tiers when a gold-owned family already covers them', () => {
    const escapeArtistId = getSkillIdByName('Escape Artist');
    const goldCandidate: CandidateSkill = {
      skillId: escapeArtistId,
      cost: skillCollection[escapeArtistId].baseCost,
      netCost: skillCollection[escapeArtistId].baseCost,
      hintLevel: 0,
      isStackable: false,
      isGold: true,
      whiteSkillId: getWhiteVersion(escapeArtistId),
      baseTierIdForGold: getWhiteVersion(escapeArtistId),
    };

    const displayCost = calculateDisplayCost(
      escapeArtistId,
      { [escapeArtistId]: goldCandidate },
      [escapeArtistId],
      false,
    );

    expect(displayCost).toBe(skillCollection[escapeArtistId].baseCost);
  });
});
