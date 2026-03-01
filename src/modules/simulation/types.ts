import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type {
  SimulationData,
  SkillSimulationData,
  SkillTrackedMetaCollection,
} from '@/modules/simulation/compare.types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';

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
  skillActivations: Record<string, SkillTrackedMetaCollection>;
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
}

export type RunComparisonParams = {
  nsamples: number;
  course: CourseData;
  racedef: RaceParameters;
  runnerA: RunnerState;
  runnerB: RunnerState;
  options: SimulationOptions;
};

export type ForcedPositionsMap = {
  uma1: Record<string, number>;
  uma2: Record<string, number>;
};

export type InjectedDebuff = {
  id: string;
  skillId: string;
  position: number;
};

export type InjectedDebuffsMap = {
  uma1: Array<InjectedDebuff>;
  uma2: Array<InjectedDebuff>;
};

export type CompareParams = {
  nsamples: number;
  course: CourseData;
  racedef: RaceParameters;
  uma1: RunnerState;
  uma2: RunnerState;
  options: SimulationOptions;
  forcedPositions?: ForcedPositionsMap;
  injectedDebuffs?: InjectedDebuffsMap;
};

export type Run1RoundParams = {
  nsamples: number;
  skills: Array<string>;
  course: CourseData;
  racedef: RaceParameters;
  uma: RunnerState;
  options: SimulationOptions;
};
