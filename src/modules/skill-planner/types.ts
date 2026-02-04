import type { SimulationData } from '@/modules/simulation/compare.types';

export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Candidate skill with purchase metadata
export interface CandidateSkill {
  skillId: string;
  hintLevel: HintLevel;

  // Stackable support
  isStackable: boolean; // Can be purchased twice
  tierLevel?: 1 | 2; // 1=base (○), 2=upgrade (◎)
  nextTierId?: string; // ID of next tier (upgrade tier)
  previousTierId?: string; // ID of previous tier (base tier)

  // Gold/White relationship
  isGold: boolean; // rarity=2 (gold) or rarity=1 (white)
  whiteSkillId?: string; // White version of this gold skill
  goldSkillId?: string; // Gold version of this white skill
  baseTierIdForGold?: string; // For gold skills, the base tier white skill ID

  // Cost calculation
  effectiveCost: number; // Calculated with all discounts applied
  displayCost?: number; // May differ from effectiveCost for bundled skills
}

// Optimization result
export type OptimizationResult = {
  skillsToBuy: ReadonlyArray<string>;
  totalCost: Readonly<number>;
  bashinStats: Readonly<{
    min: number;
    max: number;
    mean: number;
    median: number;
  }>;
  simulationCount: Readonly<number>;
  timeTaken: Readonly<number>;
  allResults: ReadonlyArray<CombinationResult>; // For showing alternative combinations
  runData?: Readonly<SimulationData>; // Full simulation data for RaceTrack visualization
};

// Individual combination result during optimization
export interface CombinationResult {
  skills: Array<string>;
  cost: number;
  bashin: number;
  runData?: SimulationData;
}

// Progress update from worker
export interface OptimizationProgress {
  completed: number;
  total: number;
  currentBest: CombinationResult | null;
}

// Cost breakdown for individual skills
export interface CostBreakdown {
  skillId: string;
  baseCost: number;
  hintDiscount: number;
  bundledWhiteCost?: number; // For gold skills when white not obtained
  finalCost: number;
}
