import type { IPosKeepMode } from './lib/runner/definitions';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { SimulationData, SkillSimulationData } from '@/modules/simulation/compare.types';
import type { CourseData } from './lib/course/definitions';
import type { RaceParameters } from './lib/definitions';

// Calculate theoretical max spurt based purely on stats (no RNG)

export type FilterReason = 'negligible-effect' | 'low-variance' | null;

export type RoundResult = {
  id: string;
  results: Array<number>;
  runData?: SimulationData;
  min: number;
  max: number;
  mean: number;
  median: number;
  filterReason?: FilterReason;
};

export type SkillBasinResponse = Record<string, RoundResult>;

export type SkillComparisonRoundResult = {
  id: string;
  results: Array<number>;
  skillActivations: Record<string, Array<{ position: number }>>;
  runData: SkillSimulationData;
  min: number;
  max: number;
  mean: number;
  median: number;
  filterReason: FilterReason | undefined;
};

export type SkillComparisonResponse = Record<string, SkillComparisonRoundResult>;

export type PoolMetrics = {
  timeTaken: number;
  totalSamples: number;
  workerCount: number;
  skillsProcessed: number;
};

export interface SimulationOptions {
  seed?: number;
  useEnhancedSpurt?: boolean;
  accuracyMode?: boolean;
  posKeepMode?: IPosKeepMode;
  mode?: string;

  // Wit Variance
  allowRushedUma1: boolean;
  allowRushedUma2: boolean;
  allowDownhillUma1: boolean;
  allowDownhillUma2: boolean;
  allowSectionModifierUma1: boolean;
  allowSectionModifierUma2: boolean;
  skillCheckChanceUma1: boolean;
  skillCheckChanceUma2: boolean;

  // Pacemaker
  pacemakerCount: number;
}

export type TheoreticalMaxSpurtResult = {
  canMaxSpurt: boolean;
  maxHp: number;
  hpNeededForMaxSpurt: number;
  maxSpurtSpeed: number;
  baseTargetSpeed2: number;
  hpRemaining: number;
};

export type RunComparisonParams = {
  nsamples: number;
  course: CourseData;
  racedef: RaceParameters;
  runnerA: RunnerState;
  runnerB: RunnerState;
  pacer: RunnerState | null;
  options: SimulationOptions;
};

export type CompareParams = {
  nsamples: number;
  course: CourseData;
  racedef: RaceParameters;
  uma1: RunnerState;
  uma2: RunnerState;
  pacer: RunnerState;
  options: SimulationOptions;
};

export type Run1RoundParams = {
  nsamples: number;
  skills: Array<string>;
  course: CourseData;
  racedef: RaceParameters;
  uma: RunnerState;
  pacer: RunnerState | null;
  options: SimulationOptions;
};
