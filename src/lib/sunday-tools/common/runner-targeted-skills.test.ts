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
import { SkillTarget, SkillType } from '@/lib/sunday-tools/skills/definitions';
import type { CreateRunner } from './runner';
import type { RaceParameters, SimulationSettings } from './race';
import { Race } from './race';

const TEST_COURSE_ID = 10101;
const TEST_DEBUFF_SKILL_ID = '201082';

const TEST_SETTINGS: SimulationSettings = {
  mode: 'compare',
  healthSystem: true,
  sectionModifier: false,
  rushed: false,
  downhill: false,
  spotStruggle: false,
  dueling: false,
  witChecks: false,
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

function createRace(options?: { runner?: Partial<CreateRunner> & Record<string, unknown> }) {
  const race = new Race({
    course: CourseHelpers.getCourse(TEST_COURSE_ID),
    parameters: TEST_RACE_PARAMS,
    settings: TEST_SETTINGS,
    skillSamples: 4,
    duelingRates: {
      runaway: 10,
      frontRunner: 10,
      paceChaser: 10,
      lateSurger: 10,
      endCloser: 10,
    },
  });

  race.onInitialize();
  race.skillSamples = 4;
  race.addRunner({
    ...TEST_RUNNER,
    ...options?.runner,
    aptitudes: {
      ...TEST_RUNNER.aptitudes,
      ...options?.runner?.aptitudes,
    },
    stats: {
      ...TEST_RUNNER.stats,
      ...options?.runner?.stats,
    },
  } as CreateRunner);
  race.prepareRace().validateRaceSetup();
  return race;
}

function waitUntilTargetedActivationOrFinish(race: Race, maxTicks = 300) {
  let sawTargeted = false;

  for (let i = 0; i < maxTicks; i++) {
    if (race.finishedRunners.length === race.runners.size) {
      break;
    }
    race.onUpdate(1 / 15);

    const raceRunner = race.runners.values().toArray()[0] as any;
    const active =
      (raceRunner.targetedTargetSpeedActive?.length ?? 0) +
      (raceRunner.targetedCurrentSpeedActive?.length ?? 0) +
      (raceRunner.targetedAccelerationActive?.length ?? 0) +
      (raceRunner.targetedLaneMovementSkillsActive?.length ?? 0) +
      (raceRunner.targetedChangeLaneSkillsActive?.length ?? 0);
    if (active > 0) {
      sawTargeted = true;
      break;
    }
  }

  return sawTargeted;
}

describe('targeted skill initialization', () => {
  it('populates pendingTargetedSkills from injectedDebuffs', () => {
    const race = createRace({
      runner: {
        injectedDebuffs: [{ skillId: TEST_DEBUFF_SKILL_ID, position: 800 }],
      },
    });

    race.prepareRound(1001);

    const raceRunner = race.runners.values().toArray()[0] as any;
    expect(raceRunner.pendingTargetedSkills.length).toBeGreaterThan(0);
    expect(raceRunner.pendingTargetedSkills[0].origin).toBe('injection');
    expect(raceRunner.pendingTargetedSkills[0].trigger.start).toBe(800);
  });

  it('leaves pendingTargetedSkills empty when no injectedDebuffs', () => {
    const race = createRace();
    race.prepareRound(1002);

    const raceRunner = race.runners.values().toArray()[0] as any;
    expect(raceRunner.pendingTargetedSkills).toEqual([]);
  });

  it('does not mix injected debuffs into pendingSkills', () => {
    const race = createRace({
      runner: {
        skills: ['110061'],
        injectedDebuffs: [{ skillId: TEST_DEBUFF_SKILL_ID, position: 850 }],
      },
    });

    race.prepareRound(1003);
    const raceRunner = race.runners.values().toArray()[0] as any;

    expect(raceRunner.pendingSkills.some((skill: { skillId: string }) => skill.skillId === '110061')).toBe(
      true,
    );
    expect(
      raceRunner.pendingSkills.some(
        (skill: { skillId: string }) => skill.skillId.split('-')[0] === TEST_DEBUFF_SKILL_ID,
      ),
    ).toBe(false);
    expect(
      raceRunner.pendingTargetedSkills.some(
        (skill: { skillId: string }) => skill.skillId.split('-')[0] === TEST_DEBUFF_SKILL_ID,
      ),
    ).toBe(true);
  });
});

describe('targeted skill activation', () => {
  it('activates targeted skill when runner reaches trigger position', () => {
    const race = createRace({
      runner: {
        injectedDebuffs: [{ skillId: TEST_DEBUFF_SKILL_ID, position: 100 }],
      },
    });

    race.prepareRound(2001);
    const sawTargeted = waitUntilTargetedActivationOrFinish(race, 600);

    expect(sawTargeted).toBe(true);
  });

  it('does not increment skillsActivatedCount for targeted effects and does not add to usedSkills', () => {
    const race = createRace({
      runner: {
        injectedDebuffs: [{ skillId: TEST_DEBUFF_SKILL_ID, position: 100 }],
      },
    });

    race.prepareRound(2002);
    const sawTargeted = waitUntilTargetedActivationOrFinish(race, 600);
    const raceRunner = race.runners.values().toArray()[0] as any;

    expect(sawTargeted).toBe(true);
    expect(raceRunner.skillsActivatedCount).toBe(0);
    expect(raceRunner.usedSkills.has(TEST_DEBUFF_SKILL_ID)).toBe(false);
  });
});

describe('targeted effect duration', () => {
  it('removes targeted effect modifier when duration expires', () => {
    const race = createRace({
      runner: {
        injectedDebuffs: [{ skillId: TEST_DEBUFF_SKILL_ID, position: 10 }],
      },
    });

    race.prepareRound(3001);

    let sawTargeted = false;
    while (race.finishedRunners.length !== race.runners.size) {
      race.onUpdate(1 / 15);
      const raceRunner = race.runners.values().toArray()[0] as any;
      const active =
        (raceRunner.targetedTargetSpeedActive?.length ?? 0) +
        (raceRunner.targetedCurrentSpeedActive?.length ?? 0) +
        (raceRunner.targetedAccelerationActive?.length ?? 0) +
        (raceRunner.targetedLaneMovementSkillsActive?.length ?? 0) +
        (raceRunner.targetedChangeLaneSkillsActive?.length ?? 0);
      if (active > 0) {
        sawTargeted = true;
      }
    }

    const raceRunner = race.runners.values().toArray()[0] as any;
    expect(sawTargeted).toBe(true);
    expect(raceRunner.modifiers.currentSpeed.acc).toBeCloseTo(0, 6);
  });
});

describe('external-only effect filtering for injected skills', () => {
  it('injecting mixed skills applies only external harmful effects', () => {
    const race = createRace({
      runner: {
        injectedDebuffs: [{ skillId: TEST_DEBUFF_SKILL_ID, position: 100 }],
      },
    });

    race.prepareRound(5001);
    const sawTargeted = waitUntilTargetedActivationOrFinish(race, 600);
    const raceRunner = race.runners.values().toArray()[0] as any;

    expect(sawTargeted).toBe(true);
    expect(raceRunner.targetedCurrentSpeedActive.length).toBeGreaterThan(0);
    expect(raceRunner.targetedTargetSpeedActive.length).toBe(0);
    expect(raceRunner.modifiers.currentSpeed.acc).toBeLessThan(0);
    expect(raceRunner.modifiers.targetSpeed.acc).toBeCloseTo(0, 6);
  });
});

describe('receiveTargetedEffect', () => {
  it('applies effect immediately without pending queue', () => {
    const race = createRace();
    race.prepareRound(4001);

    const raceRunner = race.runners.values().toArray()[0] as any;
    const initialPending = raceRunner.pendingTargetedSkills.length;

    raceRunner.receiveTargetedEffect(
      TEST_DEBUFF_SKILL_ID,
      [
        {
          target: SkillTarget.All,
          type: SkillType.TargetSpeed,
          baseDuration: 3,
          modifier: -0.2,
        },
      ],
      99,
    );

    expect(raceRunner.pendingTargetedSkills.length).toBe(initialPending);
    expect(raceRunner.targetedTargetSpeedActive.length).toBeGreaterThan(0);
    expect(raceRunner.modifiers.targetSpeed.acc).toBeLessThan(0);
  });
});
