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
  name: string;
  type: EventType;
  date: string;
  courseId: number;
  season: Season;
  ground: GroundCondition;
  weather: Weather;
  time: Time;
};

export const presets = [
  {
    name: 'Champions Meeting Oct',
    type: EventType.CM,
    date: '2025-10',
    courseId: 10602,
    season: Season.Summer,
    ground: GroundCondition.Good,
    weather: Weather.Sunny,
    time: Time.Midday,
  },
  {
    name: 'Champions Meeting Sep',
    type: EventType.CM,
    date: '2025-09',
    courseId: 10811,
    season: Season.Spring,
    ground: GroundCondition.Good,
    weather: Weather.Sunny,
    time: Time.Midday,
  },
  {
    name: 'Champions Meeting Aug',
    type: EventType.CM,
    date: '2025-08',
    courseId: 10606,
    season: Season.Spring,
    ground: GroundCondition.Good,
    weather: Weather.Sunny,
    time: Time.Midday,
  },
];

export const getPresets = () => {
  return presets
    .map((def) => ({
      type: def.type,
      date: new Date(def.date),
      courseId: def.courseId,
      racedef: createRaceConditions({
        ground: def.type == EventType.CM ? def.ground : GroundCondition.Good,
        weather: def.type == EventType.CM ? def.weather : Weather.Sunny,
        season: def.season,
        time: def.time,
      }),
    }))
    .toSorted((a, b) => +b.date - +a.date);
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
