/**
 * # Skill Planner Comparison — shared settings + result shapes
 *
 * Pure, engine-agnostic settings builder and result types for the planner's
 * paired comparison. Consumed by the live WASM path (`wasm-skill-planner.ts`).
 */
import type { RunComparisonParams } from '@/modules/simulation/types';
import type { SkillTrackedMetaCollection } from '@/modules/simulation/compare.types';
import { createCompareSettings } from './shared';

export type PlannerCompareParams = RunComparisonParams & {
  candidateSkills: Array<string>;
  ignoreStaminaConsumption: boolean;
};

export type PlannerCompareResult = {
  results: Array<number>;
  skillActivations: Record<string, SkillTrackedMetaCollection>;
  min: number;
  max: number;
  mean: number;
  median: number;
};

export function createPlannerCompareSettings(
  ignoreStaminaConsumption: boolean,
  staminaDrainOverrides: Record<string, number> | undefined
) {
  return createCompareSettings({
    healthSystem: !ignoreStaminaConsumption,
    staminaDrainOverrides: ignoreStaminaConsumption ? {} : staminaDrainOverrides
  });
}
