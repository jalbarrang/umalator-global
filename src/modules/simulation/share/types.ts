import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { WitVarianceSettings, StaminaDrainOverrides } from '@/store/settings.store';
import type { RaceConditions } from '@/utils/races';
import type { InjectedDebuffsMap } from '@/modules/simulation/types';

export const SIMULATION_SNAPSHOT_VERSION = 1 as const;

export type SimulationSnapshot = {
  version: typeof SIMULATION_SNAPSHOT_VERSION;
  timestamp: number;
  uma1: RunnerState;
  uma2: RunnerState;
  courseId: number;
  racedef: RaceConditions;
  seed: number | null;
  nsamples: number;
  witVarianceSettings: WitVarianceSettings;
  staminaDrainOverrides: StaminaDrainOverrides;
  forcedPositions: {
    uma1: Record<string, number>;
    uma2: Record<string, number>;
  };
  injectedDebuffs: InjectedDebuffsMap;
};
