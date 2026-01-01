import type { HintLevel } from './types';
import { getSkillMetaById } from '@/modules/skills/utils';

// Hint level discount mapping (as shown in game screenshots)
export const HINT_DISCOUNTS: Readonly<Record<HintLevel, number>> = {
  0: 0, // No discount
  1: 0.1, // 10% off (Hint Lvl 1)
  2: 0.2, // 20% off (Hint Lvl 2)
  3: 0.3, // 30% off (Hint Lvl 3)
  4: 0.35, // 35% off (Hint Lvl 4)
  5: 0.4, // 40% off (Hint Lvl 5 - max)
} as const;

/**
 * Calculate the effective cost of a skill with all discounts applied
 * Cost formula: baseCost * (1 - hintDiscount) * (hasFastLearner ? 0.9 : 1)
 */
export function calculateSkillCost(
  skillId: string,
  hintLevel: HintLevel,
  hasFastLearner: boolean,
): number {
  const skillMeta = getSkillMetaById(skillId);
  const baseCost = skillMeta?.baseCost ?? 0;

  const hintDiscount = HINT_DISCOUNTS[hintLevel] ?? 0;
  const fastLearnerMultiplier = hasFastLearner ? 0.9 : 1.0;

  // Apply hint discount first, then Fast Learner, then floor the result
  return Math.floor(baseCost * (1 - hintDiscount) * fastLearnerMultiplier);
}

/**
 * Get the base cost of a skill without any discounts
 */
export function getBaseCost(skillId: string): number {
  const skillMeta = getSkillMetaById(skillId);
  return skillMeta.baseCost;
}
