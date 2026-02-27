// Phase
export const Phase = {
  EarlyRace: 0,
  MidRace: 1,
  LateRace: 2,
  LastSpurt: 3,
} as const;
export type IPhase = (typeof Phase)[keyof typeof Phase];
export const phases = Object.values(Phase);
export const PhaseName = {
  [Phase.EarlyRace]: 'Early Race',
  [Phase.MidRace]: 'Mid Race',
  [Phase.LateRace]: 'Late Race',
  [Phase.LastSpurt]: 'Last Spurt',
} as const;

// Surface
export const Surface = {
  Turf: 1,
  Dirt: 2,
} as const;
export type ISurface = (typeof Surface)[keyof typeof Surface];
export const surfaces = Object.values(Surface);
export const SurfaceName = {
  [Surface.Turf]: 'Turf',
  [Surface.Dirt]: 'Dirt',
} as const;

// Distance Type
export const DistanceType = {
  Short: 1,
  Mile: 2,
  Mid: 3,
  Long: 4,
} as const;
export type IDistanceType = (typeof DistanceType)[keyof typeof DistanceType];
export const distances = Object.values(DistanceType);
export const DistanceTypeName = {
  [DistanceType.Short]: 'Short',
  [DistanceType.Mile]: 'Mile',
  [DistanceType.Mid]: 'Mid',
  [DistanceType.Long]: 'Long',
} as const;

// Orientation
export const Orientation = {
  Clockwise: 1,
  Counterclockwise: 2,
  UnusedOrientation: 3,
  NoTurns: 4,
} as const;
export type IOrientation = (typeof Orientation)[keyof typeof Orientation];
export const orientations = Object.values(Orientation);
export const OrientationName = {
  [Orientation.Clockwise]: 'Clockwise',
  [Orientation.Counterclockwise]: 'Counterclockwise',
  [Orientation.UnusedOrientation]: 'Unused Orientation',
  [Orientation.NoTurns]: 'No Turns',
} as const;

// Weather
export const Weather = {
  Sunny: 1,
  Cloudy: 2,
  Rainy: 3,
  Snowy: 4,
} as const;
export type IWeather = (typeof Weather)[keyof typeof Weather];
export const weathers = Object.values(Weather);
export const WeatherName = {
  [Weather.Sunny]: 'Sunny',
  [Weather.Cloudy]: 'Cloudy',
  [Weather.Rainy]: 'Rainy',
  [Weather.Snowy]: 'Snowy',
} as const;

// Ground Condition
export const GroundCondition = {
  Firm: 1,
  Good: 2,
  Soft: 3,
  Heavy: 4,
} as const;
export type IGroundCondition = (typeof GroundCondition)[keyof typeof GroundCondition];
export const groundConditions = Object.values(GroundCondition);
export const GroundConditionName = {
  [GroundCondition.Firm]: 'Firm',
  [GroundCondition.Good]: 'Good',
  [GroundCondition.Soft]: 'Soft',
  [GroundCondition.Heavy]: 'Heavy',
} as const;

// Season
export const Season = {
  Spring: 1,
  Summer: 2,
  Autumn: 3,
  Winter: 4,
  Sakura: 5,
} as const;
export type ISeason = (typeof Season)[keyof typeof Season];
export const seasons = Object.values(Season);
export const SeasonName = {
  [Season.Spring]: 'Spring',
  [Season.Summer]: 'Summer',
  [Season.Autumn]: 'Autumn',
  [Season.Winter]: 'Winter',
  [Season.Sakura]: 'Sakura',
} as const;

// Time of Day
export const TimeOfDay = {
  NoTime: 0,
  Morning: 1,
  Midday: 2,
  Evening: 3,
  Night: 4,
} as const;
export type ITimeOfDay = (typeof TimeOfDay)[keyof typeof TimeOfDay];
export const timeOfDays = Object.values(TimeOfDay);
export const TimeOfDayName = {
  [TimeOfDay.NoTime]: 'No Time',
  [TimeOfDay.Morning]: 'Morning',
  [TimeOfDay.Midday]: 'Midday',
  [TimeOfDay.Evening]: 'Evening',
  [TimeOfDay.Night]: 'Night',
} as const;

// Grade
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
export const grades = Object.values(Grade);
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

// Threshold Stat
export const ThresholdStat = {
  Speed: 1,
  Stamina: 2,
  Power: 3,
  Guts: 4,
  Int: 5,
} as const;
export type IThresholdStat = (typeof ThresholdStat)[keyof typeof ThresholdStat];
export const thresholdStats = Object.values(ThresholdStat);
export const ThresholdStatName = {
  [ThresholdStat.Speed]: 'Speed',
  [ThresholdStat.Stamina]: 'Stamina',
  [ThresholdStat.Power]: 'Power',
  [ThresholdStat.Guts]: 'Guts',
  [ThresholdStat.Int]: 'Wit',
} as const;

// Corner
export type ICorner = {
  start: number;
  length: number;
};

// Straight
export type IStraight = {
  start: number;
  end: number;
  frontType: number;
};

// Slope
export type ISlope = {
  start: number;
  length: number;
  slope: number;
};

// Event Type
export const EventType = {
  CM: 0,
  LOH: 1,
} as const;
export type IEventType = (typeof EventType)[keyof typeof EventType];
export const EventTypeNames = {
  CM: 'Champions Meeting (CM)',
  LOH: 'Legend of Heroes (LOH)',
} as const;

// Course
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
  corners: Array<ICorner>;
  straights: Array<IStraight>;
  slopes: Array<ISlope>;
};

export type Courses = Record<number, ICourse>;

export type CourseData = {
  readonly raceTrackId: number;
  readonly distance: number;
  readonly distanceType: IDistanceType;
  readonly surface: ISurface;
  readonly turn: IOrientation;

  readonly courseSetStatus: ReadonlyArray<IThresholdStat>;

  readonly corners: ReadonlyArray<ICorner>;
  readonly straights: ReadonlyArray<IStraight>;
  readonly slopes: ReadonlyArray<ISlope>;

  readonly laneMax: number;
  readonly courseWidth: number;
  readonly horseLane: number;
  readonly laneChangeAcceleration: number;
  readonly laneChangeAccelerationPerFrame: number;
  readonly maxLaneDistance: number;
  readonly moveLanePoint: number;
};
