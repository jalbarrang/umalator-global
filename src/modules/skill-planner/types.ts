import type { SimulationData } from '@/modules/simulation/compare.types';
import type { CourseData } from '@/modules/simulation/lib/course/definitions';
import type { RaceParameters } from '@/modules/simulation/lib/definitions';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { SimulationOptions } from '@/modules/simulation/types';

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
export type OptimizationResult = {
  skillsToBuy: ReadonlyArray<string>;
  totalCost: Readonly<number>;
  // Expanded statistics
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

// Skill planner simulation types
export interface SkillPlannerSimulationParams {
  nsamples: number;
  course: CourseData;
  racedef: RaceParameters;
  baseRunner: RunnerState; // Runner with obtained skills only
  skillCombinations: Array<Array<string>>; // Array of skill combinations to test
  options: SimulationOptions;
}

export interface CombinationSimulationResult {
  skills: Array<string>; // The skill combination tested
  bashin: number; // Mean bashin gain
  min: number;
  max: number;
  median: number;
}

export interface BatchSimulationResult {
  results: Array<CombinationSimulationResult>;
  totalSimulations: number;
}
