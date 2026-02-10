import { Region, RegionList } from '../../../../utils/Region';
import { Aptitude, Strategy } from '../../../../runner/definitions';
import {
  DistanceType,
  Grade,
  GroundCondition,
  Orientation,
  Season,
  Surface,
  TimeOfDay,
  Weather,
} from '../../../../course/definitions';
import type { CourseData, ICorner, ISlope, IStraight } from '../../../../course/definitions';
import type { HorseParameters } from '../../../../runner/HorseTypes';
import type { RaceParameters } from '../../../../definitions';

/**
 * Creates a mock CourseData for testing
 */
export function createMockCourse(overrides?: Partial<CourseData>): CourseData {
  const distance = 2000;

  const defaultCorners: Array<ICorner> = [
    { start: 200, length: 150 },
    { start: 500, length: 150 },
    { start: 1000, length: 150 },
    { start: 1400, length: 150 },
  ];

  const defaultStraights: Array<IStraight> = [
    { start: 0, end: 200, frontType: 1 },
    { start: 350, end: 500, frontType: 2 },
    { start: 650, end: 1000, frontType: 1 },
    { start: 1150, end: 1400, frontType: 2 },
    { start: 1550, end: 2000, frontType: 1 },
  ];

  const defaultSlopes: Array<ISlope> = [
    { start: 100, length: 80, slope: 2 }, // uphill
    { start: 300, length: 50, slope: -1.5 }, // downhill
    { start: 800, length: 100, slope: 3 }, // uphill
    { start: 1200, length: 60, slope: -2 }, // downhill
  ];

  return {
    raceTrackId: 10101,
    distance,
    distanceType: DistanceType.Mid,
    surface: Surface.Turf,
    turn: Orientation.Counterclockwise,
    courseSetStatus: [],
    corners: defaultCorners,
    straights: defaultStraights,
    slopes: defaultSlopes,
    laneMax: 10,
    courseWidth: 11.25,
    horseLane: 0.625,
    laneChangeAcceleration: 0.03,
    laneChangeAccelerationPerFrame: 0.002,
    maxLaneDistance: 11.25,
    moveLanePoint: 200,
    ...overrides,
  };
}

/**
 * Creates a mock HorseParameters for testing
 */
export function createMockHorse(overrides?: Partial<HorseParameters>): HorseParameters {
  return {
    speed: 1200,
    stamina: 1000,
    power: 1100,
    guts: 900,
    wisdom: 1000,
    strategy: Strategy.PaceChaser,
    distanceAptitude: Aptitude.S,
    surfaceAptitude: Aptitude.A,
    strategyAptitude: Aptitude.B,
    rawStamina: 1000,
    ...overrides,
  };
}

/**
 * Creates mock RaceParameters for testing
 */
export function createMockRaceParams(overrides?: Partial<RaceParameters>): RaceParameters {
  return {
    mood: 0,
    groundCondition: GroundCondition.Good,
    weather: Weather.Sunny,
    season: Season.Spring,
    time: TimeOfDay.Midday,
    grade: Grade.G1,
    popularity: 5,
    orderRange: [1, 9],
    numUmas: 18,
    skillId: '100001',
    ...overrides,
  };
}

/**
 * Creates a RegionList covering the entire course
 */
export function createWholeRegion(distance: number = 2000): RegionList {
  const regions = new RegionList();
  regions.push(new Region(0, distance));
  return regions;
}

/**
 * Creates a mock RaceState for testing dynamic conditions
 */
export function createMockRaceState(overrides?: Partial<any>): any {
  return {
    accumulatetime: { t: 0 },
    activateCount: [0, 0, 0],
    activateCountHeal: 0,
    hp: {
      hpRatioRemaining: () => 1.0,
      hasRemainingHp: () => true,
    },
    isLastSpurt: false,
    lastSpurtTransition: -1,
    startDelay: 0,
    usedSkills: new Set<string>(),
    randomLot: 50,
    gateRoll: 123456,
    ...overrides,
  };
}
