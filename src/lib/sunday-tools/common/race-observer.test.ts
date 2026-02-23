import { describe, expect, it } from 'vitest';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { Grade, GroundCondition, Season, TimeOfDay, Weather } from '@/lib/sunday-tools/course/definitions';
import { Aptitude, Mood, Strategy } from '@/lib/sunday-tools/runner/definitions';
import { SkillTarget, SkillType } from '@/lib/sunday-tools/skills/definitions';
import type { CreateRunner } from './runner';
import type { RaceLifecycleObserver, RaceParameters, SimulationSettings } from './race';
import { Race } from './race';
import { SkillCompareDataCollector, VacuumCompareDataCollector } from './race-observer';

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

function createRaceWithCollector(
  collector?: RaceLifecycleObserver,
  options?: {
    settings?: Partial<SimulationSettings>;
    runner?: Partial<CreateRunner>;
  },
) {
  const settings: SimulationSettings = {
    ...TEST_SETTINGS,
    ...options?.settings,
  };
  const runner: CreateRunner = {
    ...TEST_RUNNER,
    ...options?.runner,
    aptitudes: {
      ...TEST_RUNNER.aptitudes,
      ...(options?.runner?.aptitudes ?? {}),
    },
    stats: {
      ...TEST_RUNNER.stats,
      ...(options?.runner?.stats ?? {}),
    },
  };

  const race = new Race({
    course: CourseHelpers.getCourse(TEST_COURSE_ID),
    parameters: TEST_RACE_PARAMS,
    settings,
    skillSamples: 5,
    duelingRates: {
      runaway: 10,
      frontRunner: 10,
      paceChaser: 10,
      lateSurger: 10,
      endCloser: 10,
    },
    collector,
  });

  race.onInitialize();
  race.skillSamples = 5;
  race.addRunner(runner);
  race.prepareRace().validateRaceSetup();
  return race;
}

describe('Race observer lifecycle', () => {
  it('fires lifecycle hooks in the expected order', () => {
    const events: Array<string> = [];
    let observedSeed: number | null = null;
    let beforeTickCount = 0;
    let afterRunnerTickCount = 0;
    let runnerFinishedCount = 0;

    const observer: RaceLifecycleObserver = {
      onRoundStart: (_race, seed) => {
        observedSeed = seed;
        events.push('round-start');
      },
      onBeforeTick: () => {
        beforeTickCount++;
        events.push('before-tick');
      },
      onAfterRunnerTick: () => {
        afterRunnerTickCount++;
        events.push('after-runner-tick');
      },
      onRunnerFinished: () => {
        runnerFinishedCount++;
        events.push('runner-finished');
      },
      onRoundEnd: () => {
        events.push('round-end');
      },
    };

    const race = createRaceWithCollector(observer);
    race.prepareRound(1234);
    race.run();

    expect(observedSeed).toBe(1234);
    expect(events[0]).toBe('round-start');
    expect(events[events.length - 1]).toBe('round-end');
    expect(beforeTickCount).toBeGreaterThan(0);
    expect(afterRunnerTickCount).toBe(beforeTickCount);
    expect(runnerFinishedCount).toBe(1);
  });
});

describe('VacuumCompareDataCollector', () => {
  it('collects frame data and finish snapshots', () => {
    const collector = new VacuumCompareDataCollector();
    const race = createRaceWithCollector(collector);

    race.prepareRound(888);
    race.run();

    const roundData = collector.getPrimaryRunnerRoundData();
    expect(roundData).not.toBeNull();

    if (!roundData) {
      return;
    }

    expect(roundData.time.length).toBeGreaterThan(0);
    expect(roundData.position.length).toBe(roundData.time.length);
    expect(roundData.velocity.length).toBe(roundData.time.length);
    expect(roundData.hp.length).toBe(roundData.time.length);
    expect(roundData.currentLane.length).toBe(roundData.time.length);
    expect(roundData.pacerGap.length).toBe(roundData.time.length);
    expect(roundData.finished).toBe(true);
    expect(roundData.finishPosition).toBeGreaterThan(0);
    expect(roundData.finishPosition).toBeLessThanOrEqual(race.course.distance);
    expect(roundData.startDelay).toBeGreaterThanOrEqual(0);

    for (const logs of Object.values(roundData.skillActivations)) {
      for (const log of logs) {
        expect(log.end).toBeGreaterThanOrEqual(log.start);
      }
    }
  });
});

describe('SkillCompareDataCollector fallback path', () => {
  it('emits fallback effect log when tracked skill was used without active effect logs', () => {
    const collector = new SkillCompareDataCollector({
      trackedSkillId: '999999',
      fallbackEffectType: SkillType.Noop,
      fallbackEffectTarget: SkillTarget.Self,
    });

    collector.onRoundStart(createRaceWithCollector(), 42);

    const collectorAny = collector as any;
    collectorAny.primaryRunnerId = 0;
    collectorAny.runnerStates.set(0, {
      data: {
        runnerId: 0,
        time: [],
        position: [875],
        velocity: [],
        hp: [],
        currentLane: [],
        pacerGap: [],
        skillActivations: {},
        startDelay: 0,
        rushed: [],
        duelingRegion: [],
        spotStruggleRegion: [],
        hasAchievedFullSpurt: false,
        outOfHp: false,
        outOfHpPosition: null,
        nonFullSpurtVelocityDiff: null,
        nonFullSpurtDelayDistance: null,
        firstPositionInLateRace: false,
        usedSkills: ['999999'],
        finished: true,
        finishPosition: 875,
      },
      openEffectsByKey: new Map(),
      effectSequence: 0,
      seenUsedSkills: new Set(['999999']),
    });

    collector.finalizeCurrentTrackedMeta(1.5);
    const run = collector.buildCurrentSkillRun();
    const logs = run.sk[1]['999999'] ?? [];

    expect(logs).toHaveLength(1);
    expect(logs[0].start).toBe(875);
    expect(logs[0].end).toBe(875);
    expect(logs[0].effectType).toBe(SkillType.Noop);
    expect(logs[0].effectTarget).toBe(SkillTarget.Self);

    const trackedMeta = collector.getTrackedMetaCollection();
    expect(trackedMeta).toHaveLength(1);
    expect(trackedMeta[0].horseLength).toBe(1.5);
    expect(trackedMeta[0].positions).toEqual([875]);
  });
});
