import type { SimulationData } from '@/modules/simulation/compare.types';

export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

// Candidate skill with purchase metadata
export interface CandidateSkill {
  skillId: string;
  hintLevel: HintLevel;
  isObtained: boolean; // Already owned, excluded from budget
  isStackable: boolean; // Can be purchased twice
  effectiveCost: number; // Calculated with all discounts applied
}

// Optimization result
export interface OptimizationResult {
  skillsToBuy: Array<string>;
  totalCost: number;
  // Expanded statistics
  bashinStats: {
    min: number;
    max: number;
    mean: number;
    median: number;
  };
  simulationCount: number;
  timeTaken: number;
  allResults: Array<CombinationResult>; // For showing alternative combinations
  runData?: SimulationData; // Full simulation data for RaceTrack visualization
}

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
