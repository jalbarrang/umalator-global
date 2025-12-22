import type { DynamicCondition } from '../skills/activation/ConditionRegistry';
import type {
  IPositionKeepState,
  ISkillPerspective,
  ISkillRarity,
  ISkillTarget,
  ISkillType,
} from '../skills/types';
import type { Region } from '../utils/Region';
import type { HpPolicy } from '@/modules/simulation/lib/physics/health/HealthPolicy';
import type { IStrategy } from '@/modules/simulation/lib/runner/types';
import type { InGameTimer } from '@/modules/simulation/lib/utils/Timer';

export const Surface = {
  Turf: 1,
  Dirt: 2,
} as const;
export type ISurface = (typeof Surface)[keyof typeof Surface];
export const surfaces: ReadonlyArray<ISurface> = Object.values(Surface);
export const SurfaceName = {
  [Surface.Turf]: 'Turf',
  [Surface.Dirt]: 'Dirt',
} as const;

export const DistanceType = {
  Short: 1,
  Mile: 2,
  Mid: 3,
  Long: 4,
} as const;
export type IDistanceType = (typeof DistanceType)[keyof typeof DistanceType];
export const distances: ReadonlyArray<IDistanceType> = Object.values(DistanceType);
export const DistanceTypeName = {
  [DistanceType.Short]: 'Short',
  [DistanceType.Mile]: 'Mile',
  [DistanceType.Mid]: 'Mid',
  [DistanceType.Long]: 'Long',
} as const;

export const Orientation = {
  Clockwise: 1,
  Counterclockwise: 2,
  UnusedOrientation: 3,
  NoTurns: 4,
} as const;
export type IOrientation = (typeof Orientation)[keyof typeof Orientation];
export const orientations: ReadonlyArray<IOrientation> = Object.values(Orientation);
export const OrientationName = {
  [Orientation.Clockwise]: 'Clockwise',
  [Orientation.Counterclockwise]: 'Counterclockwise',
  [Orientation.UnusedOrientation]: 'Unused Orientation',
  [Orientation.NoTurns]: 'No Turns',
} as const;

export const ThresholdStat = {
  Speed: 1,
  Stamina: 2,
  Power: 3,
  Guts: 4,
  Int: 5,
} as const;
export type IThresholdStat = (typeof ThresholdStat)[keyof typeof ThresholdStat];
export const thresholdStats: ReadonlyArray<IThresholdStat> = Object.values(ThresholdStat);
export const ThresholdStatName = {
  [ThresholdStat.Speed]: 'Speed',
  [ThresholdStat.Stamina]: 'Stamina',
  [ThresholdStat.Power]: 'Power',
  [ThresholdStat.Guts]: 'Guts',
  [ThresholdStat.Int]: 'Int',
} as const;

export const Mood = {
  Awful: -2,
  Bad: -1,
  Normal: 0,
  Good: 1,
  Great: 2,
} as const;
export type IMood = (typeof Mood)[keyof typeof Mood];
export const moods: ReadonlyArray<IMood> = Object.values(Mood);
export const MoodName = {
  [Mood.Awful]: 'Awful',
  [Mood.Bad]: 'Bad',
  [Mood.Normal]: 'Normal',
  [Mood.Good]: 'Good',
  [Mood.Great]: 'Great',
} as const;

export const GroundCondition = {
  Firm: 1,
  Good: 2,
  Soft: 3,
  Heavy: 4,
} as const;
export type IGroundCondition = (typeof GroundCondition)[keyof typeof GroundCondition];
export const groundConditions: ReadonlyArray<IGroundCondition> = Object.values(GroundCondition);
export const GroundConditionName = {
  [GroundCondition.Firm]: 'Firm',
  [GroundCondition.Good]: 'Good',
  [GroundCondition.Soft]: 'Soft',
  [GroundCondition.Heavy]: 'Heavy',
} as const;

export const Weather = {
  Sunny: 1,
  Cloudy: 2,
  Rainy: 3,
  Snowy: 4,
} as const;
export type IWeather = (typeof Weather)[keyof typeof Weather];
export const weathers: ReadonlyArray<IWeather> = Object.values(Weather);
export const WeatherName = {
  [Weather.Sunny]: 'Sunny',
  [Weather.Cloudy]: 'Cloudy',
  [Weather.Rainy]: 'Rainy',
  [Weather.Snowy]: 'Snowy',
} as const;

export const Season = {
  Spring: 1,
  Summer: 2,
  Autumn: 3,
  Winter: 4,
  Sakura: 5,
} as const;
export type ISeason = (typeof Season)[keyof typeof Season];
export const seasons: ReadonlyArray<ISeason> = Object.values(Season);
export const SeasonName = {
  [Season.Spring]: 'Spring',
  [Season.Summer]: 'Summer',
  [Season.Autumn]: 'Fall',
  [Season.Winter]: 'Winter',
  [Season.Sakura]: 'Sakura',
} as const;

export const TimeOfDay = {
  NoTime: 0,
  Morning: 1,
  Midday: 2,
  Evening: 3,
  Night: 4,
} as const;
export type ITimeOfDay = (typeof TimeOfDay)[keyof typeof TimeOfDay];
export const timesOfDay: ReadonlyArray<ITimeOfDay> = Object.values(TimeOfDay);
export const TimeOfDayName = {
  [TimeOfDay.NoTime]: 'No Time',
  [TimeOfDay.Morning]: 'Morning',
  [TimeOfDay.Midday]: 'Midday',
  [TimeOfDay.Evening]: 'Evening',
  [TimeOfDay.Night]: 'Night',
} as const;

export const Grade = {
  G1: 100,
  G2: 200,
  G3: 300,
  OP: 400,
  PreOP: 700,
  Maiden: 800,
  Debut: 900,
  Daily: 999,
} as const;
export type IGrade = (typeof Grade)[keyof typeof Grade];
export const grades: ReadonlyArray<IGrade> = Object.values(Grade);
export const GradeName = {
  [Grade.G1]: 'G1',
  [Grade.G2]: 'G2',
  [Grade.G3]: 'G3',
  [Grade.OP]: 'OP',
  [Grade.PreOP]: 'PreOP',
  [Grade.Maiden]: 'Maiden',
  [Grade.Debut]: 'Debut',
  [Grade.Daily]: 'Daily',
} as const;

export const Phase = {
  EarlyRace: 0,
  MidRace: 1,
  LateRace: 2,
  LastSpurt: 3,
} as const;
export type IPhase = (typeof Phase)[keyof typeof Phase];
export const phases: ReadonlyArray<IPhase> = Object.values(Phase);
export const PhaseName = {
  [Phase.EarlyRace]: 'Early Race',
  [Phase.MidRace]: 'Mid Race',
  [Phase.LateRace]: 'Late Race',
  [Phase.LastSpurt]: 'Last Spurt',
} as const;

export type RaceParameters = {
  mood: IMood;
  groundCondition: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  timeOfDay: ITimeOfDay;
  grade: IGrade;
  popularity: number;
  orderRange?: [number, number];
  numUmas?: number;
  skillId: string;
};

export type PartialRaceParameters = Omit<
  { -readonly [K in keyof RaceParameters]: RaceParameters[K] },
  'skillId'
>;

export type RaceState = {
  accumulatetime: Readonly<InGameTimer>;
  activateCount: Array<number>;
  activateCountHeal: number;
  currentSpeed: number;
  isLastSpurt: boolean;
  lastSpurtSpeed: number;
  lastSpurtTransition: number;
  positionKeepState: IPositionKeepState;
  isDownhillMode: boolean;
  phase: IPhase;
  pos: number;
  hp: Readonly<HpPolicy>;
  randomLot: number;
  startDelay: number;
  gateRoll: number;
  usedSkills: ReadonlySet<string>;
  leadCompetition: boolean;
  posKeepStrategy: IStrategy;
};

export type SkillEffect = {
  type: ISkillType;
  baseDuration: number;
  modifier: number;
  target: ISkillTarget;
};

export type PendingSkill = {
  skillId: string;
  perspective: ISkillPerspective;
  rarity: ISkillRarity;
  trigger: Region;
  extraCondition: DynamicCondition;
  effects: Array<SkillEffect>;
  originWisdom?: number;
};

export type ActiveSkill = {
  executionId: string;
  skillId: string;
  perspective: ISkillPerspective;
  durationTimer: InGameTimer;
  modifier: number;
  effectType: ISkillType;
  effectTarget: ISkillTarget;
};

export type ICourse = {
  raceTrackId: number;
  distance: number;
  distanceType: IDistanceType;
  surface: ISurface;
  turn: IOrientation;
  course: number;
  laneMax: number;
  finishTimeMin: number;
  finishTimeMax: number;
  courseSetStatus: Array<IThresholdStat>;
  corners: Array<{ start: number; length: number }>;
  straights: Array<{ start: number; end: number; frontType: number }>;
  slopes: Array<{ start: number; length: number; slope: number }>;
};

export type Courses = Record<number, ICourse>;

export type CourseData = {
  readonly raceTrackId: number;
  readonly distance: number;
  readonly distanceType: IDistanceType;
  readonly surface: ISurface;
  readonly turn: IOrientation;

  readonly courseSetStatus: ReadonlyArray<IThresholdStat>;
  readonly corners: ReadonlyArray<{
    readonly start: number;
    readonly length: number;
  }>;

  readonly straights: ReadonlyArray<{
    readonly start: number;
    readonly end: number;
    readonly frontType: number;
  }>;

  readonly slopes: ReadonlyArray<{
    readonly start: number;
    readonly length: number;
    readonly slope: number;
  }>;

  readonly laneMax: number;
  readonly courseWidth: number;
  readonly horseLane: number;
  readonly laneChangeAcceleration: number;
  readonly laneChangeAccelerationPerFrame: number;
  readonly maxLaneDistance: number;
  readonly moveLanePoint: number;
};
