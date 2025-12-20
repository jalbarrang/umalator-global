import type {
  DistanceType,
  Orientation,
  Phase,
  Surface,
  ThresholdStat,
} from './constants';

export type IThresholdStat = (typeof ThresholdStat)[keyof typeof ThresholdStat];
export type IDistanceType = (typeof DistanceType)[keyof typeof DistanceType];
export type IOrientation = (typeof Orientation)[keyof typeof Orientation];
export type ISurface = (typeof Surface)[keyof typeof Surface];
export type IPhase = (typeof Phase)[keyof typeof Phase];

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
