import {
  Grade,
  GroundCondition,
  Mood,
  RaceParameters,
  Season,
  Time,
  Weather,
} from '@simulation/lib/RaceParameters';

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
  Nige: [1, 1],
  Senkou: [2, 4],
  Sasi: [5, 9],
  Oikomi: [5, 9],
  Oonige: [1, 1],
};

export enum EventType {
  CM,
  LOH,
}

export type RaceConditions = {
  mood: Mood;
  ground: GroundCondition;
  weather: Weather;
  season: Season;
  time: Time;
  grade: Grade;
};

export const defaultRaceConditions: RaceConditions = {
  mood: 2,
  ground: GroundCondition.Good,
  weather: Weather.Sunny,
  season: Season.Spring,
  time: Time.Midday,
  grade: Grade.G1,
};

export const createRaceConditions = (
  conditions: Partial<RaceConditions> = {},
): RaceConditions => {
  return {
    ...defaultRaceConditions,
    ...conditions,
  };
};

export type RacePreset = {
  id: string;
  name: string;
  type: EventType;
  date: string;
  courseId: number;
  season: Season;
  ground: GroundCondition;
  weather: Weather;
  time: Time;
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
