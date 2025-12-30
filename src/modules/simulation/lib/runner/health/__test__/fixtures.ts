import type { PRNG } from '@/modules/simulation/lib/utils/Random';
import type { CourseData, IGroundCondition } from '@/modules/simulation/lib/course/definitions';
import type { HorseParameters } from '@/modules/simulation/lib/runner/HorseTypes';
import type { RaceState } from '@/modules/simulation/lib/core/RaceSolver';
import type { HpPolicy } from '@/modules/simulation/lib/runner/health/HpPolicy';
import { Surface } from '@/modules/simulation/lib/course/definitions';
import { Aptitude, Strategy } from '@/modules/simulation/lib/runner/definitions';
import { PositionKeepState } from '@/modules/simulation/lib/skills/definitions';

/**
 * Creates a deterministic mock PRNG that cycles through a predefined sequence
 */
export function createMockPRNG(sequence: Array<number> = [0.5]): PRNG {
  let index = 0;

  return {
    int32(): number {
      const value = sequence[index % sequence.length];
      index++;
      return Math.floor(value * 0x100000000);
    },
    random(): number {
      const value = sequence[index % sequence.length];
      index++;
      return value;
    },
    uniform(upper: number): number {
      const value = sequence[index % sequence.length];
      index++;
      return Math.floor(value * upper);
    },
  };
}

/**
 * Creates a mock CourseData optimized for HP testing
 */
export function createMockCourseForHp(overrides?: Partial<CourseData>): CourseData {
  const distance = overrides?.distance ?? 2000;

  return {
    raceTrackId: 10101,
    distance,
    distanceType: 2, // Mid
    surface: Surface.Turf,
    turn: 2, // Counterclockwise
    courseSetStatus: [],
    corners: [
      { start: 200, length: 150 },
      { start: 1400, length: 150 },
    ],
    straights: [
      { start: 0, end: 200, frontType: 1 },
      { start: 350, end: 1400, frontType: 1 },
      { start: 1550, end: distance, frontType: 1 },
    ],
    slopes: [
      { start: 100, length: 80, slope: 200 }, // uphill 2.0%
      { start: 800, length: 100, slope: 150 }, // uphill 1.5%
    ],
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
 * Creates a mock HorseParameters with sensible HP test defaults
 */
export function createMockHorseForHp(overrides?: Partial<HorseParameters>): HorseParameters {
  return {
    speed: 1200,
    stamina: 1000,
    power: 1000,
    guts: 900,
    wisdom: 1000,
    strategy: Strategy.PaceChaser,
    distanceAptitude: Aptitude.A,
    surfaceAptitude: Aptitude.A,
    strategyAptitude: Aptitude.A,
    rawStamina: 1000,
    ...overrides,
  };
}

/**
 * Creates a mock RaceState for HP policy testing
 */
export function createMockRaceStateForHp(overrides?: Partial<RaceState>): RaceState {
  const mockHpPolicy: HpPolicy = {
    hp: 1000,
    init: () => {},
    tick: () => {},
    hasRemainingHp: () => true,
    hpRatioRemaining: () => 1.0,
    recover: () => {},
    getLastSpurtPair: () => [-1, 20],
    isMaxSpurt: () => false,
  };

  return {
    accumulatetime: { t: 0 },
    activateCount: [0, 0, 0],
    activateCountHeal: 0,
    currentSpeed: 15.0,
    isLastSpurt: false,
    lastSpurtSpeed: 20.0,
    lastSpurtTransition: -1,
    positionKeepState: PositionKeepState.None,
    isDownhillMode: false,
    phase: 0,
    pos: 0,
    hp: mockHpPolicy,
    randomLot: 50,
    startDelay: 0.05,
    gateRoll: 123456,
    usedSkills: new Set(),
    leadCompetition: false,
    posKeepStrategy: Strategy.PaceChaser,
    ...overrides,
  } as RaceState;
}

/**
 * Helper to get ground modifier for tests
 */
export function getGroundModifier(surface: number, ground: IGroundCondition): number {
  const HpConsumptionGroundModifier = [
    [],
    [0, 1.0, 1.0, 1.02, 1.02],
    [0, 1.0, 1.0, 1.01, 1.02],
  ] as const;
  return HpConsumptionGroundModifier[surface][ground] as number;
}

/**
 * Helper to get strategy coefficient for tests
 */
export function getStrategyCoefficient(strategy: number): number {
  const HpStrategyCoefficient = [0, 0.95, 0.89, 1.0, 0.995, 0.86] as const;
  return HpStrategyCoefficient[strategy];
}

