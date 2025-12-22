import { Grade, GroundCondition, Season, TimeOfDay, Weather } from '../core/types';
import type { IGrade, IGroundCondition, ISeason, ITimeOfDay, IWeather } from '../core/types';

export function parseGroundCondition(g: string | IGroundCondition) {
  if (typeof g != 'string') {
    return g;
  }
  switch (g.toUpperCase()) {
    case 'GOOD':
      return GroundCondition.Firm;
    case 'YIELDING':
      return GroundCondition.Good;
    case 'SOFT':
      return GroundCondition.Soft;
    case 'HEAVY':
      return GroundCondition.Heavy;
    default:
      throw new Error('Invalid ground condition.');
  }
}

export function parseWeather(w: string | IWeather) {
  if (typeof w != 'string') {
    return w;
  }
  switch (w.toUpperCase()) {
    case 'SUNNY':
      return Weather.Sunny;
    case 'CLOUDY':
      return Weather.Cloudy;
    case 'RAINY':
      return Weather.Rainy;
    case 'SNOWY':
      return Weather.Snowy;
    default:
      throw new Error('Invalid weather.');
  }
}

export function parseSeason(s: string | ISeason) {
  if (typeof s != 'string') {
    return s;
  }
  switch (s.toUpperCase()) {
    case 'SPRING':
      return Season.Spring;
    case 'SUMMER':
      return Season.Summer;
    case 'AUTUMN':
      return Season.Autumn;
    case 'WINTER':
      return Season.Winter;
    case 'SAKURA':
      return Season.Sakura;
    default:
      throw new Error('Invalid season.');
  }
}

export function parseTime(t: string | ITimeOfDay) {
  if (typeof t != 'string') {
    return t;
  }

  switch (t.toUpperCase()) {
    case 'NONE':
    case 'NOTIME':
      return TimeOfDay.NoTime;
    case 'MORNING':
      return TimeOfDay.Morning;
    case 'MIDDAY':
      return TimeOfDay.Midday;
    case 'EVENING':
      return TimeOfDay.Evening;
    case 'NIGHT':
      return TimeOfDay.Night;
    default:
      throw new Error('Invalid race time.');
  }
}

export function parseGrade(g: string | IGrade) {
  if (typeof g != 'string') {
    return g;
  }
  switch (g.toUpperCase()) {
    case 'G1':
      return Grade.G1;
    case 'G2':
      return Grade.G2;
    case 'G3':
      return Grade.G3;
    case 'OP':
      return Grade.OP;
    case 'PRE-OP':
    case 'PREOP':
      return Grade.PreOP;
    case 'MAIDEN':
      return Grade.Maiden;
    case 'DEBUT':
      return Grade.Debut;
    case 'DAILY':
      return Grade.Daily;
    default:
      throw new Error('Invalid race grade.');
  }
}
