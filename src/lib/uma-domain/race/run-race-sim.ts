import type { CourseData } from '../course/definitions';
import type { IStrategy } from '../runner/definitions';
import type { CreateRunner } from '../runner/types';
import type { RaceEvent } from './race-event-log';
import type { RaceSimCollectedResult } from './race-sim-collector';
import type { RaceParameters } from './types';

export type RaceSimParams = {
  course: CourseData;
  parameters: RaceParameters;
  runners: CreateRunner[];
  nsamples: number;
  masterSeed: number;
  focusRunnerIds?: number[];
};

export type FinishEntry = {
  runnerId: number;
  name: string;
  strategy: IStrategy;
  finishPosition: number;
  finishTime: number;
};

export type RaceSimResult = {
  finishOrders: FinishEntry[][];
  collectedData: RaceSimCollectedResult;
  eventLogs: RaceEvent[][];
};
