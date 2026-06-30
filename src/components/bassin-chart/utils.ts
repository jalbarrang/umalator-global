import type { RoundResult, SkillComparisonRoundResult } from '@/modules/simulation/types';

// Re-export chart utilities for external consumers
function getNullRow(skillid: string): RoundResult {
  return {
    id: skillid,
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    results: [],
    runData: undefined
  };
}

export function getNullSkillComparisonRow(skillid: string): SkillComparisonRoundResult {
  return {
    id: skillid,
    skillActivations: {},
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    results: [],
    runData: {
      minrun: {
        sk: [{}, {}]
      },
      maxrun: {
        sk: [{}, {}]
      },
      meanrun: {
        sk: [{}, {}]
      },
      medianrun: {
        sk: [{}, {}]
      }
    },
    filterReason: undefined
  };
}

export const defaultSimulationOptions = {
  allowRushedUma1: false,
  allowRushedUma2: false,
  allowDownhillUma1: false,
  allowDownhillUma2: false,
  allowSectionModifierUma1: false,
  allowSectionModifierUma2: false,
  useEnhancedSpurt: false,
  accuracyMode: false,
  skillCheckChanceUma1: false,
  skillCheckChanceUma2: false
};
