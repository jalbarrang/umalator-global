import { CourseHelpers } from '../course/CourseData';
import { Aptitude, Strategy } from './types';
import type { IAptitude, IStrategy, RunnerParameters } from './types';
import type { CourseData, IDistanceType, IGroundCondition, IMood } from '../core/types';

export type HorseDesc = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: string | IStrategy;
  distanceAptitude: string | IAptitude;
  surfaceAptitude: string | IAptitude;
  strategyAptitude: string | IAptitude;
  mood: IMood;
};

export const GroundSpeedModifier = [
  null, // ground types started at 1
  [0, 0, 0, 0, -50],
  [0, 0, 0, 0, -50],
] as const;

export const GroundPowerModifier = [
  null,
  [0, 0, -50, -50, -50],
  [0, -100, -50, -100, -100],
] as const;

export const StrategyProficiencyModifier = [1.1, 1.0, 0.85, 0.75, 0.6, 0.4, 0.2, 0.1] as const;

// ? Whats Asitame?
// Re: Its a skill that increases the speed of the uma when the power is high enough.
export const Asitame = {
  StrategyDistanceCoefficient: [
    // [Front Runner, Pace Chaser, Late Surger, End Closer, Runaway]
    [], // distances are 1-indexed (as are strategies, hence the 0 in the first column for every row)
    [0, 1.0, 0.7, 0.75, 0.7, 1.0], // short
    [0, 1.0, 0.8, 0.7, 0.75, 1.0], // mile
    [0, 1.0, 0.9, 0.875, 0.86, 1.0], // medium
    [0, 1.0, 0.9, 1.0, 0.9, 1.0], // long
  ] as const,

  BaseModifier: 0.00875 as const,

  calcApproximateModifier(power: number, strategy: IStrategy, distance: IDistanceType) {
    return (
      this.BaseModifier *
      Math.sqrt(power - 1200) *
      this.StrategyDistanceCoefficient[distance][strategy]
    );
  },
};

// ? Whats Syoubu?:
// Re: Its a skill that increases the speed of the uma when the stamina is high enough.
export const StaminaSyoubu = {
  distanceFactor(distance: number) {
    if (distance < 2101) return 0.0;
    else if (distance < 2201) return 0.5;
    else if (distance < 2401) return 1.0;
    else if (distance < 2601) return 1.2;
    else return 1.5;
  },

  calcApproximateModifier(stamina: number, distance: number) {
    const randomFactor = 1.0; // TODO implement random factor scaling based on power (unclear how this works currently)

    return Math.sqrt(stamina - 1200) * 0.0085 * this.distanceFactor(distance) * randomFactor;
  },
};

export function parseStrategy(s: string | IStrategy) {
  if (typeof s != 'string') {
    return s;
  }
  switch (s.toUpperCase()) {
    case 'NIGE':
      return Strategy.FrontRunner;
    case 'SENKOU':
      return Strategy.PaceChaser;
    case 'SASI':
    case 'SASHI':
      return Strategy.LateSurger;
    case 'OIKOMI':
      return Strategy.EndCloser;
    case 'OONIGE':
      return Strategy.Runaway;
    default:
      throw new Error('Invalid running strategy.');
  }
}

export function parseAptitude(a: string | IAptitude, type: string) {
  if (typeof a != 'string') {
    return a;
  }
  switch (a.toUpperCase()) {
    case 'S':
      return Aptitude.S;
    case 'A':
      return Aptitude.A;
    case 'B':
      return Aptitude.B;
    case 'C':
      return Aptitude.C;
    case 'D':
      return Aptitude.D;
    case 'E':
      return Aptitude.E;
    case 'F':
      return Aptitude.F;
    case 'G':
      return Aptitude.G;
    default:
      throw new Error('Invalid ' + type + ' aptitude.');
  }
}

export const adjustOvercap = (stat: number) => {
  return stat > 1200 ? 1200 + Math.floor((stat - 1200) / 2) : stat;
};

export const calculateMoodCoefficient = (mood: IMood) => {
  return 1 + 0.02 * mood;
};

export type BaseStats = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: IStrategy;
  distanceAptitude: IAptitude;
  surfaceAptitude: IAptitude;
  strategyAptitude: IAptitude;
  rawStamina: number;
};

export const buildBaseStats = (horseDesc: HorseDesc): BaseStats => {
  const moodCoefficient = calculateMoodCoefficient(horseDesc.mood);

  return {
    speed: adjustOvercap(horseDesc.speed) * moodCoefficient,
    stamina: adjustOvercap(horseDesc.stamina) * moodCoefficient,
    power: adjustOvercap(horseDesc.power) * moodCoefficient,
    guts: adjustOvercap(horseDesc.guts) * moodCoefficient,
    wisdom: adjustOvercap(horseDesc.wisdom) * moodCoefficient,
    strategy: parseStrategy(horseDesc.strategy),
    distanceAptitude: parseAptitude(horseDesc.distanceAptitude, 'distance'),
    surfaceAptitude: parseAptitude(horseDesc.surfaceAptitude, 'surface'),
    strategyAptitude: parseAptitude(horseDesc.strategyAptitude, 'strategy'),
    rawStamina: horseDesc.stamina * moodCoefficient,
  };
};

export type AdjustedStats = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  strategy: IStrategy;
  distanceAptitude: IAptitude;
  surfaceAptitude: IAptitude;
  strategyAptitude: IAptitude;
  rawStamina: number;
};

export const buildAdjustedStats = (
  baseStats: RunnerParameters,
  course: CourseData,
  ground: IGroundCondition,
): AdjustedStats => {
  const raceCourseModifier = CourseHelpers.courseSpeedModifier(course, baseStats);

  return {
    speed: Math.max(
      baseStats.speed * raceCourseModifier + GroundSpeedModifier[course.surface][ground],
      1,
    ),
    stamina: baseStats.stamina,
    power: Math.max(baseStats.power + GroundPowerModifier[course.surface][ground], 1),
    guts: baseStats.guts,
    wisdom: baseStats.wisdom * StrategyProficiencyModifier[baseStats.strategyAptitude],
    strategy: baseStats.strategy,
    distanceAptitude: baseStats.distanceAptitude,
    surfaceAptitude: baseStats.surfaceAptitude,
    strategyAptitude: baseStats.strategyAptitude,
    rawStamina: baseStats.rawStamina,
  };
};
