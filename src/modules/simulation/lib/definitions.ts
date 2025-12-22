import type { IMood } from './runner/definitions';
import type { IGrade, IGroundCondition, ISeason, ITimeOfDay, IWeather } from './course/definitions';

export type RaceParameters = {
  mood: IMood;
  groundCondition: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  time: ITimeOfDay;
  grade: IGrade;
  popularity: number;
  orderRange?: [number, number];
  numUmas?: number;
  skillId: string;
};
