import { SimulationData } from '@/store/race/compare.types';
import { PosKeepMode } from './lib/RaceSolver';
import { RunnerState } from '../runners/components/runner-card/types';
import { CourseData } from './lib/CourseData';
import { RaceParameters } from './lib/RaceParameters';

// Calculate theoretical max spurt based purely on stats (no RNG)

export type RoundResult = {
  id: string;
  results: number[];
  runData: SimulationData;
  min: number;
  max: number;
  mean: number;
  median: number;
};

export interface SimulationOptions {
  seed?: number;
  useEnhancedSpurt?: boolean;
  accuracyMode?: boolean;
  posKeepMode?: PosKeepMode;
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
  pacer: RunnerState;
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
  skills: string[];
  course: CourseData;
  racedef: RaceParameters;
  uma: RunnerState;
  pacer: RunnerState;
  options: SimulationOptions;
};
