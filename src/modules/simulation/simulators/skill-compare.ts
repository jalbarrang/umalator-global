/**
 * # Skill Comparison — shared settings + result shape
 *
 * Pure, engine-agnostic settings builder and result type for skill comparison.
 * Consumed by the live WASM path (`wasm-skill-compare.ts`).
 */
import type { RunComparisonParams } from '@/modules/simulation/types';
import type {
  SkillSimulationData,
  SkillTrackedMetaCollection
} from '@/modules/simulation/compare.types';
import { createCompareSettings } from './shared';

export interface SkillComparisonResult {
  results: Array<number>;
  skillActivations: Record<string, SkillTrackedMetaCollection>;
  runData: SkillSimulationData;

  min: number;
  max: number;
  mean: number;
  median: number;
}

export function createSkillCompareSettings(options: RunComparisonParams['options']) {
  const ignoreStaminaConsumption = options.ignoreStaminaConsumption ?? true;
  return createCompareSettings({
    healthSystem: !ignoreStaminaConsumption,
    staminaDrainOverrides: ignoreStaminaConsumption ? {} : options.staminaDrainOverrides
  });
}
