import { Race } from '../common/race';
import type { CreateRunner } from '../common/runner';
import type { RaceParameters } from '../common/race';
import type { CourseData } from '../course/definitions';
import type { IStrategy } from '../runner/definitions';
import { RaceSimDataCollector, type RaceSimCollectedResult } from './race-sim-collector';
import { RaceEventLogCollector, type RaceEvent } from './race-event-log';

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

const NORMAL_SIM_SETTINGS = {
  mode: 'normal' as const,
  healthSystem: true,
  sectionModifier: true,
  rushed: true,
  downhill: true,
  spotStruggle: true,
  dueling: true,
  witChecks: true,
  positionKeepMode: 2,
};

const ZERO_DUELING_RATES = {
  runaway: 0,
  frontRunner: 0,
  paceChaser: 0,
  lateSurger: 0,
  endCloser: 0,
};

export function runRaceSim(params: RaceSimParams): RaceSimResult {
  if (!Number.isInteger(params.nsamples) || params.nsamples <= 0) {
    throw new Error(`Invalid nsamples: ${params.nsamples}`);
  }

  if (params.runners.length !== 9) {
    throw new Error(`runRaceSim expects exactly 9 runners, got ${params.runners.length}`);
  }

  const race = new Race({
    course: params.course,
    parameters: params.parameters,
    settings: NORMAL_SIM_SETTINGS,
    skillSamples: 0,
    duelingRates: ZERO_DUELING_RATES,
  });

  race.onInitialize();

  for (const runner of params.runners) {
    race.addRunner(runner);
  }

  race.prepareRace().validateRaceSetup();

  const finishOrders: FinishEntry[][] = [];
  const collector = new RaceSimDataCollector(params.focusRunnerIds ?? []);
  const eventLogCollector = new RaceEventLogCollector();
  const unsubscribeCollector = collector.subscribe(race.events);
  const unsubscribeEventLogCollector = eventLogCollector.subscribe(race.events);

  try {
    for (let i = 0; i < params.nsamples; i++) {
      race.prepareRound(params.masterSeed + i);
      race.run();

      const finishOrder: FinishEntry[] = race.finishedRunners.map((runnerId) => {
        const runner = race.runners.get(runnerId);
        if (!runner) {
          throw new Error(`Runner not found in race map for id ${runnerId}`);
        }

        return {
          runnerId,
          name: runner.name,
          strategy: runner.strategy,
          finishPosition: runner.position,
          finishTime: runner.finishTime,
        };
      });

      finishOrders.push(finishOrder);
    }
  } finally {
    unsubscribeCollector();
    unsubscribeEventLogCollector();
  }

  const collectedData = collector.getResult();
  const eventLogs = eventLogCollector.getResult();

  return {
    finishOrders,
    collectedData,
    eventLogs,
  };
}
