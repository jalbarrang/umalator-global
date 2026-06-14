import { describe, expect, it } from 'vitest';
import { coursesService } from '@/modules/data/services/CourseService';
import {
  Grade,
  GroundCondition,
  Season,
  TimeOfDay,
  Weather
} from 'sunday-tools/course/definitions';
import { Aptitude, Mood, Strategy } from 'sunday-tools/runner/definitions';
import type { CreateRunner } from './runner';
import type { RaceParameters, SimulationSettings } from './race';
import { Race } from './race';

const TEST_COURSE_ID = 10101;

const SETTINGS: SimulationSettings = {
  mode: 'normal',
  healthSystem: false,
  sectionModifier: false,
  rushed: false,
  downhill: false,
  spotStruggle: false,
  dueling: false,
  witChecks: false,
  positionKeepMode: 0
};

const PARAMS: RaceParameters = {
  ground: GroundCondition.Firm,
  weather: Weather.Sunny,
  season: Season.Spring,
  timeOfDay: TimeOfDay.Midday,
  grade: Grade.G1
};

const baseRunner = (overrides: Partial<CreateRunner> = {}): CreateRunner => ({
  outfitId: '100101',
  mood: Mood.Great,
  strategy: Strategy.FrontRunner,
  aptitudes: { distance: Aptitude.S, surface: Aptitude.A, strategy: Aptitude.A },
  stats: { speed: 1200, stamina: 1200, power: 800, guts: 400, wit: 400 },
  skills: [],
  ...overrides
});

function buildRace(runners: CreateRunner[]): Race {
  const race = new Race({
    course: coursesService.getSimCourse(TEST_COURSE_ID),
    parameters: PARAMS,
    settings: SETTINGS,
    skillSamples: 1,
    duelingRates: { runaway: 0, frontRunner: 0, paceChaser: 0, lateSurger: 0, endCloser: 0 }
  });
  race.onInitialize();
  for (const runner of runners) race.addRunner(runner);
  return race;
}

function gates(race: Race): number[] {
  return Array.from(race.runners.values()).map((runner) => runner.gate);
}

describe('Race.assignGates fixed-gate handling', () => {
  it('keeps the default behaviour when no gates are fixed (unique 0-8 permutation)', () => {
    const race = buildRace(Array.from({ length: 9 }, () => baseRunner()));
    race.prepareRound(12345);
    const assigned = gates(race);
    expect(new Set(assigned).size).toBe(9);
    expect([...assigned].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('honours fully fixed gates exactly', () => {
    const desired = [8, 7, 6, 5, 4, 3, 2, 1, 0];
    const race = buildRace(desired.map((gate) => baseRunner({ gate })));
    race.prepareRound(999);
    expect(gates(race)).toEqual(desired);
  });

  it('honours partial fixed gates and fills the rest from the remaining pool', () => {
    // Runner 0 fixed to gate 4, runner 1 fixed to gate 0; the other 7 random.
    const runners = [
      baseRunner({ gate: 4 }),
      baseRunner({ gate: 0 }),
      ...Array.from({ length: 7 }, () => baseRunner())
    ];
    const race = buildRace(runners);
    race.prepareRound(42);
    const assigned = gates(race);
    expect(assigned[0]).toBe(4);
    expect(assigned[1]).toBe(0);
    expect(new Set(assigned).size).toBe(9);
    expect([...assigned].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('falls back to random for colliding or out-of-range requests', () => {
    // Two runners request gate 3 (collision); one requests an invalid gate 99.
    const runners = [
      baseRunner({ gate: 3 }),
      baseRunner({ gate: 3 }),
      baseRunner({ gate: 99 }),
      ...Array.from({ length: 6 }, () => baseRunner())
    ];
    const race = buildRace(runners);
    race.prepareRound(7);
    const assigned = gates(race);
    // First request for gate 3 is honoured; the rest still form a valid permutation.
    expect(assigned[0]).toBe(3);
    expect(new Set(assigned).size).toBe(9);
    expect([...assigned].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
