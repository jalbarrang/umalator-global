export type Mood = -2 | -1 | 0 | 1 | 2;

export enum GroundCondition {
  Good = 1, // Firm
  Yielding, // Good
  Soft, // Soft
  Heavy, // Heavy
}

export enum Weather {
  Sunny = 1,
  Cloudy,
  Rainy,
  Snowy,
}

export enum Season {
  Spring = 1,
  Summer,
  Autumn,
  Winter,
  Sakura,
}

export enum Time {
  NoTime,
  Morning,
  Midday,
  Evening,
  Night,
}

export enum Grade {
  G1 = 100,
  G2 = 200,
  G3 = 300,
  OP = 400,
  PreOP = 700,
  Maiden = 800,
  Debut = 900,
  Daily = 999,
}

export type RaceParameters = {
  mood: Mood;
  groundCondition: GroundCondition;
  weather: Weather;
  season: Season;
  time: Time;
  grade: Grade;
  popularity: number;
  orderRange?: [number, number];
  numUmas?: number;
  skillId: string;
};
