import type { IRunnerState } from '@/modules/runners/components/runner-card/types';
import type { RaceConditions } from '@/utils/races';

export const RACE_SIM_SNAPSHOT_VERSION = 1 as const;

export type RaceSimSnapshot = {
  version: typeof RACE_SIM_SNAPSHOT_VERSION;
  timestamp: number;
  runners: IRunnerState[];
  courseId: number;
  racedef: RaceConditions;
  nsamples: number;
  seed: number | null;
  focusRunnerIndices: number[];
};
