import type {
  IGrade,
  IGroundCondition,
  IMood,
  ISeason,
  ITimeOfDay,
  IWeather,
  RaceParameters,
} from '@/modules/simulation/lib/core/types';
import {
  Grade,
  GroundCondition,
  Season,
  TimeOfDay,
  Weather,
} from '@/modules/simulation/lib/core/types';

export type PosKeepLabel = {
  umaIndex: number;
  text: string;
  color: { stroke: string; fill: string };
  start: number;
  end: number;
  duration: number;
  x?: number;
  width?: number;
  yOffset?: number;
};

export const ORDER_RANGE_FOR_STRATEGY = {
  FrontRunner: [1, 1],
  PaceChaser: [2, 4],
  LateSurger: [5, 9],
  EndCloser: [5, 9],
  Runaway: [1, 1],
};

export const EventType = {
  CM: 0,
  LOH: 1,
} as const;
export type IEventType = (typeof EventType)[keyof typeof EventType];
export const EventTypeName = {
  [EventType.CM]: 'CM',
  [EventType.LOH]: 'LOH',
} as const;

export type RaceConditions = {
  mood: IMood;
  ground: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  timeOfDay: ITimeOfDay;
  grade: IGrade;
};

export const defaultRaceConditions: RaceConditions = {
  mood: 2,
  ground: GroundCondition.Good,
  weather: Weather.Sunny,
  season: Season.Spring,
  timeOfDay: TimeOfDay.Midday,
  grade: Grade.G1,
};

export const createRaceConditions = (conditions: Partial<RaceConditions> = {}): RaceConditions => {
  return {
    ...defaultRaceConditions,
    ...conditions,
  };
};

export type RacePreset = {
  id: string;
  name: string;
  type: IEventType;
  date: string;
  courseId: number;
  season: ISeason;
  ground: IGroundCondition;
  weather: IWeather;
  time: ITimeOfDay;
};

export function racedefToParams(
  { mood, ground, weather, season, timeOfDay: time, grade }: RaceConditions,
  includeOrder?: string,
): RaceParameters {
  let orderForStrategy: [number, number] | undefined = undefined;

  if (includeOrder) {
    orderForStrategy = ORDER_RANGE_FOR_STRATEGY[
      includeOrder as keyof typeof ORDER_RANGE_FOR_STRATEGY
    ] as [number, number];
  }

  return {
    mood,
    groundCondition: ground,
    weather,
    season,
    timeOfDay: time,
    grade,
    popularity: 1,
    skillId: '',
    orderRange: orderForStrategy,
    numUmas: 9,
  };
}
