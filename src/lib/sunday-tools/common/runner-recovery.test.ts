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
import { Region } from '@/lib/sunday-tools/shared/region';
import { SkillRarity, SkillTarget, SkillType } from '@/lib/sunday-tools/skills/definitions';
import type { CreateRunner } from './runner';
import type { PendingSkill } from '../skills/skill.types';
import type { RaceParameters, SimulationSettings } from './race';
import { Race } from './race';

const TEST_COURSE_ID = 10101;
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
  skills: [],
};

function createRace(skillIds: Array<string>, overrides?: Record<string, number>) {
  const race = new Race({
    course: CourseHelpers.getCourse(TEST_COURSE_ID),
    parameters: TEST_RACE_PARAMS,
    settings: {
      ...TEST_SETTINGS,
      staminaDrainOverrides: overrides ?? {},
    },
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
  race.addRunner({
    ...TEST_RUNNER,
    skills: skillIds,
  });
  race.prepareRace().validateRaceSetup();
  return race;
}

type TestRunner = {
  pendingSkills: Array<PendingSkill>;
  skillRng: {
    random: () => number;
    int32: () => number;
    uniform: (upper: number) => number;
  };
  healthPolicy: {
    healthRatioRemaining: () => number;
  };
  healsActivatedCount: number;
  activateSkill: (skill: PendingSkill) => void;
};

function getRunner(race: Race): TestRunner {
  return race.runners.values().toArray()[0] as unknown as TestRunner;
}

function setSkillRoll(runner: TestRunner, roll: number) {
  runner.skillRng = {
    random: () => roll,
    int32: () => 0,
    uniform: () => 0,
  };
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

describe('recovery resolution in runner', () => {
  it('uses the documented MultiplyRandom drain split for Nothing Ventured instead of draining 100%', () => {
    const race = createRace(['202031']);
    race.prepareRound(7001);

    const runner = getRunner(race);
    const pendingSkill = getPendingSkill(runner, '202031');
    setSkillRoll(runner, 0.95);

    runner.activateSkill(pendingSkill);

    expect(runner.healthPolicy.healthRatioRemaining()).toBeCloseTo(0.96, 6);
    expect(runner.healsActivatedCount).toBe(0);
  });

  it('does not count zero-result MultiplyRandom rolls as heal activations', () => {
    const race = createRace(['202032']);
    race.prepareRound(7002);

    const runner = getRunner(race);
    const pendingSkill = getPendingSkill(runner, '202032');
    setSkillRoll(runner, 0.5);

    runner.activateSkill(pendingSkill);

    expect(runner.healthPolicy.healthRatioRemaining()).toBeCloseTo(1, 6);
    expect(runner.healsActivatedCount).toBe(0);
  });

  it('still counts positive recovery activations as heals', () => {
    const race = createRace([]);
    race.prepareRound(7003);

    const runner = getRunner(race);
    const recoverySkill: PendingSkill = {
      skillId: 'test-recovery',
      rarity: SkillRarity.Gold,
      trigger: new Region(0, 1),
      extraCondition: () => true,
      effects: [
        {
          type: SkillType.Recovery,
          target: SkillTarget.Self,
          baseDuration: 0,
          modifier: 0.055,
        },
      ],
    };

    runner.activateSkill(recoverySkill);

    expect(runner.healsActivatedCount).toBe(1);
  });
});
