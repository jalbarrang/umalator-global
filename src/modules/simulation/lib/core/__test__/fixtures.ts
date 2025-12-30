import {
  DistanceType,
  Grade,
  GroundCondition,
  Orientation,
  Season,
  Surface,
  TimeOfDay,
  Weather,
} from '../../course/definitions';
import { Aptitude, Strategy } from '../../runner/definitions';
import { NoopHpPolicy } from '../../runner/health/HpPolicy';
import { Region, RegionList } from '../../utils/Region';
import { SeededRng } from '../../utils/Random';
import { RaceSolver } from '../RaceSolver';
import type { HorseParameters } from '../../runner/HorseTypes';
import type { PRNG } from '../../utils/Random';
import type { PendingSkill } from '../RaceSolver';
import type { CourseData, ICorner, ISlope, IStraight } from '../../course/definitions';
import type { RaceParameters } from '../../definitions';

/**
 * Creates a mock CourseData for testing with correct slope scale (basis points)
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

  // Use correct slope scale: 10000 = 1% grade
  const defaultSlopes: Array<ISlope> = [
    { start: 100, length: 80, slope: 20000 }, // 2% uphill
    { start: 300, length: 50, slope: -15000 }, // -1.5% downhill
    { start: 800, length: 100, slope: 30000 }, // 3% uphill
    { start: 1200, length: 60, slope: -20000 }, // -2% downhill
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
 * Creates a mock PRNG with a fixed seed for deterministic testing
 */
export function createMockPRNG(seed: number = 12345): PRNG {
  return new SeededRng(seed);
}

/**
 * Creates a mock PendingSkill for testing
 */
export function createMockSkill(overrides?: Partial<PendingSkill>): PendingSkill {
  return {
    skillId: 'test_skill_001',
    perspective: 1,
    rarity: 1,
    trigger: new Region(0, 2000),
    extraCondition: () => true,
    effects: [],
    ...overrides,
  };
}

/**
 * Factory to create a RaceSolver with sensible defaults for testing
 */
export function createRaceSolver(
  overrides?: Partial<{
    horse: HorseParameters;
    course: CourseData;
    rng: PRNG;
    skills: Array<PendingSkill>;
    disableRushed: boolean;
    disableDownhill: boolean;
    disableSectionModifier: boolean;
    speedUpProbability: number;
    skillCheckChance: boolean;
  }>,
): RaceSolver {
  const horse = overrides?.horse ?? createMockHorse();
  const course = overrides?.course ?? createMockCourse();
  const rng = overrides?.rng ?? createMockPRNG();
  const skills = overrides?.skills ?? [];

  return new RaceSolver({
    horse,
    course,
    rng,
    skills,
    hp: NoopHpPolicy,
    disableRushed: overrides?.disableRushed ?? true,
    disableDownhill: overrides?.disableDownhill ?? true,
    disableSectionModifier: overrides?.disableSectionModifier ?? true,
    speedUpProbability: overrides?.speedUpProbability ?? 0,
    skillCheckChance: overrides?.skillCheckChance ?? false,
  });
}

/**
 * Helper to advance RaceSolver to a specific phase
 */
export function advanceToPhase(solver: RaceSolver, targetPhase: number): void {
  const dt = 0.015; // ~15 FPS
  const maxIterations = 100000; // Safety limit
  let iterations = 0;

  while (solver.phase < targetPhase && iterations < maxIterations) {
    solver.step(dt);
    iterations++;
  }

  if (iterations >= maxIterations) {
    throw new Error(`Failed to reach phase ${targetPhase} within ${maxIterations} iterations`);
  }
}

/**
 * Helper to advance RaceSolver to a specific position
 */
export function advanceToPosition(solver: RaceSolver, targetPosition: number): void {
  const dt = 0.015; // ~15 FPS
  const maxIterations = 100000; // Safety limit
  let iterations = 0;

  while (solver.pos < targetPosition && iterations < maxIterations) {
    solver.step(dt);
    iterations++;
  }

  if (iterations >= maxIterations) {
    throw new Error(
      `Failed to reach position ${targetPosition} within ${maxIterations} iterations`,
    );
  }
}

/**
 * Helper to run the simulation for a specific duration in seconds
 */
export function advanceByTime(solver: RaceSolver, seconds: number): void {
  const dt = 0.015; // ~15 FPS
  const steps = Math.ceil(seconds / dt);

  for (let i = 0; i < steps; i++) {
    solver.step(dt);
  }
}

