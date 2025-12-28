import type { RaceParameters } from '@/modules/simulation/lib/definitions';
import type {
  IEventType,
  IGrade,
  IGroundCondition,
  ISeason,
  ITimeOfDay,
  IWeather,
} from '@/modules/simulation/lib/course/definitions';
import type { IMood } from '@/modules/simulation/lib/runner/definitions';
import { Mood } from '@/modules/simulation/lib/runner/definitions';
import {
  Grade,
  GroundCondition,
  Season,
  TimeOfDay,
  Weather,
} from '@/modules/simulation/lib/course/definitions';

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
  ['Front Runner']: [1, 1],
  ['Pace Chaser']: [2, 4],
  'Late Surger': [5, 9],
  'End Closer': [5, 9],
  Runaway: [1, 1],
};

export type RaceConditions = {
  mood: IMood;
  ground: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  time: ITimeOfDay;
  grade: IGrade;
};

export const defaultRaceConditions: RaceConditions = {
  mood: Mood.Normal,
  ground: GroundCondition.Firm,
  weather: Weather.Sunny,
  season: Season.Spring,
  time: TimeOfDay.Midday,
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
  { mood, ground, weather, season, time, grade }: RaceConditions,
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
    time,
    grade,
    popularity: 1,
    skillId: '',
    orderRange: orderForStrategy,
    numUmas: 9,
  };
}
