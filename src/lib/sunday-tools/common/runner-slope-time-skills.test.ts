import { describe, expect, it } from 'vitest';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import {
  Grade,
  GroundCondition,
  Season,
  TimeOfDay,
  Weather,
} from '@/lib/sunday-tools/course/definitions';
import { Aptitude, Mood, Strategy } from '@/lib/sunday-tools/runner/definitions';
import type { PendingSkill } from '@/lib/sunday-tools/skills/skill.types';
import type { CreateRunner } from './runner';
import type { RaceParameters, SimulationSettings } from './race';
import { Race } from './race';

const TOKYO_TURF_2300M = 10605;
const TOKYO_TURF_2400M = 10606;
const RESTLESS = '201281';

const TEST_SETTINGS: SimulationSettings = {
  mode: 'compare',
  healthSystem: true,
  sectionModifier: false,
  rushed: false,
  downhill: false,
  spotStruggle: false,
  dueling: false,
  witChecks: false,
  positionKeepMode: 0,
  staminaDrainOverrides: {},
};

const TEST_RACE_PARAMS: RaceParameters = {
  ground: GroundCondition.Firm,
  weather: Weather.Sunny,
  season: Season.Spring,
  timeOfDay: TimeOfDay.Midday,
  grade: Grade.G1,
};

const TEST_RUNNER: CreateRunner = {
  outfitId: '100101',
  mood: Mood.Great,
  strategy: Strategy.FrontRunner,
  aptitudes: {
    distance: Aptitude.S,
    surface: Aptitude.A,
    strategy: Aptitude.A,
  },
  stats: {
    speed: 1200,
    stamina: 1200,
    power: 800,
    guts: 400,
    wit: 400,
  },
  skills: [RESTLESS],
};

type TestRunner = {
  pendingSkills: Array<PendingSkill>;
  usedSkills: Set<string>;
  skillsActivatedCount: number;
};

function createRace(courseId: number) {
  const race = new Race({
    course: CourseHelpers.getCourse(courseId),
    parameters: TEST_RACE_PARAMS,
    settings: TEST_SETTINGS,
    skillSamples: 1,
    duelingRates: {
      runaway: 10,
      frontRunner: 10,
      paceChaser: 10,
      lateSurger: 10,
      endCloser: 10,
    },
  });

  race.onInitialize();
  race.skillSamples = 1;
  race.addRunner(TEST_RUNNER);
  race.prepareRace().validateRaceSetup();
  return race;
}

function getRunner(race: Race): TestRunner {
  return race.runners.values().toArray()[0] as unknown as TestRunner;
}

function getPendingSkill(runner: TestRunner, baseSkillId: string): PendingSkill {
  const pendingSkill = runner.pendingSkills.find(
    (skill: PendingSkill) => (skill.skillId.split('-')[0] ?? skill.skillId) === baseSkillId,
  );

  if (!pendingSkill) {
    throw new Error(`Expected pending skill ${baseSkillId}`);
  }

  return pendingSkill;
}

describe('slope + accumulatetime skill triggers', () => {
  it('skips Tokyo 2400m start uphill for Restless and keeps the first uphill after 10s', () => {
    const race = createRace(TOKYO_TURF_2400M);
    race.prepareRound(2400);

    const runner = getRunner(race);
    const pendingSkill = getPendingSkill(runner, RESTLESS);

    expect(pendingSkill.trigger.start).toBe(1125);
    expect(pendingSkill.trigger.end).toBe(1200);
  });

  it('keeps the first valid uphill trigger for Restless on Tokyo 2300m', () => {
    const race = createRace(TOKYO_TURF_2300M);
    race.prepareRound(2300);

    const runner = getRunner(race);
    const pendingSkill = getPendingSkill(runner, RESTLESS);

    expect(pendingSkill.trigger.start).toBe(1025);
    expect(pendingSkill.trigger.end).toBe(1100);
  });

  it('can still activate Restless on Tokyo 2400m after the 10s condition is met', () => {
    const race = createRace(TOKYO_TURF_2400M);
    race.prepareRound(2401);

    const runner = getRunner(race);

    for (let i = 0; i < 2500; i++) {
      if (runner.usedSkills.has(RESTLESS) || race.finishedRunners.length === race.runners.size) {
        break;
      }

      race.onUpdate(1 / 15);
    }

    expect(runner.usedSkills.has(RESTLESS)).toBe(true);
    expect(runner.skillsActivatedCount).toBeGreaterThan(0);
  });
});
