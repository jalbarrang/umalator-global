import type { CourseData, IGrade, IGroundCondition, ISeason, ITimeOfDay, IWeather } from '../course/definitions';
import type { IStrategy } from '../runner/definitions';
import type { CreateRunner, Runner } from '../runner/types';

export type SimulationSettings = {
  mode: 'compare' | 'normal';
  healthSystem: boolean;
  sectionModifier: boolean;
  rushed: boolean;
  downhill: boolean;
  conservePower?: boolean;
  spotStruggle: boolean;
  dueling: boolean;
  witChecks: boolean;
  positionKeepMode: number;
  staminaDrainOverrides?: Record<string, number>;
};

export type DuelingRates = {
  runaway: number;
  frontRunner: number;
  paceChaser: number;
  lateSurger: number;
  endCloser: number;
};

export type RaceParameters = {
  ground: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  timeOfDay: ITimeOfDay;
  grade: IGrade;
  strategyCounts?: Map<IStrategy, number>;
  commonSkills?: Map<string, number>;
  numUmas?: number;
  [key: string]: any;
};

export type Race = {
  course: CourseData;
  runners: Map<number, Runner>;
  finishedRunners?: number[];
};

export type RaceLifecycleObserver = {
  onRoundStart(race: Race, seed: number): void;
  onBeforeTick(race: Race, dt: number): void;
  onAfterRunnerTick(race: Race, runner: Runner, dt: number): void;
  onRunnerFinished(race: Race, runner: Runner): void;
  onRoundEnd(race: Race): void;
};

export type RaceSimulatorProps = {
  parameters: RaceParameters;
  course: CourseData;
  settings: SimulationSettings;
  skillSamples: number;
  duelingRates: DuelingRates;
};

export type RaceSimParams = {
  course: CourseData;
  parameters: RaceParameters;
  runners: CreateRunner[];
  nsamples: number;
  masterSeed: number;
  focusRunnerIds?: number[];
};
