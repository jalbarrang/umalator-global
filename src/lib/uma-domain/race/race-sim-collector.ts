import type { CollectedRunnerRoundData } from './race-observer';
import type { FinishEntry } from './run-race-sim';

export type RaceSimCollectedRound = {
  seed: number;
  finishOrder: FinishEntry[];
  focusRunnerData: Record<number, CollectedRunnerRoundData>;
  allRunnerPositions: Record<number, number[]>;
  allRunnerLanes: Record<number, number[]>;
};

export type RaceSimCollectedResult = {
  rounds: RaceSimCollectedRound[];
};
