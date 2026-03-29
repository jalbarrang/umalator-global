import { describe, expect, it } from 'vitest';
import { cloneDeep } from 'es-toolkit';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { createRunnerState, runawaySkillId } from '@/modules/runners/components/runner-card/types';
import { createRaceConditions, racedefToParams } from '@/utils/races';
import type { CompareParams, SimulationOptions } from '@/modules/simulation/types';
import { runSkillComparison } from './skill-compare';
import { runPlannerComparison } from './skill-planner-compare';
import { runComparison } from './vacuum-compare';
import {
  createCompareSettings,
  createInitializedRace,
  createSkillSorterByGroup,
  computePositionDiff,
  DEFAULT_DUELING_RATES,
  toCreateRunner,
  toSundayRaceParameters,
} from './shared';
import {
  BassinCollector,
  VacuumCompareDataCollector,
} from '@/lib/sunday-tools/common/race-observer';

const TEST_COURSE_ID = 10101;

function createSimulationOptions(seed: number): SimulationOptions {
  return {
    seed,
    useEnhancedSpurt: false,
    accuracyMode: false,
    allowRushedUma1: false,
    allowRushedUma2: false,
    allowDownhillUma1: false,
    allowDownhillUma2: false,
    allowSectionModifierUma1: false,
    allowSectionModifierUma2: false,
    skillCheckChanceUma1: false,
    skillCheckChanceUma2: false,
  };
}

describe('skill-compare simulator', () => {
  it('is deterministic for the same input seed', () => {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const runnerA = createRunnerState({ outfitId: '100101', skills: [] });
    const runnerB = cloneDeep(runnerA);
    const options = createSimulationOptions(777);

    const first = runSkillComparison({
      trackedSkillId: '10011',
      nsamples: 8,
      course,
      racedef,
      runnerA,
      runnerB,
      options,
    });

    const second = runSkillComparison({
      trackedSkillId: '10011',
      nsamples: 8,
      course,
      racedef,
      runnerA,
      runnerB,
      options,
    });

    expect(first.results).toEqual(second.results);
    expect(first.mean).toBe(second.mean);
    expect(first.median).toBe(second.median);
    expect(first.skillActivations).toEqual({});
  });

  it('keeps basin sign consistent when runnerA is faster than runnerB', () => {
    const course = CourseHelpers.getCourse(10914);
    const racedef = racedefToParams(
      createRaceConditions({
        ground: 4,
        weather: 3,
        season: 1,
        time: 2,
      }),
    );

    const runnerA = createRunnerState({
      outfitId: '100602',
      speed: 1200,
      stamina: 900,
      power: 800,
      guts: 600,
      wisdom: 1000,
      strategy: 'Pace Chaser',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2,
      skills: ['110061', '200741', '201351', '200351'],
      randomMobId: 8256,
    });
    const runnerB = createRunnerState({
      outfitId: '100602',
      speed: 1200,
      stamina: 900,
      power: 800,
      guts: 600,
      wisdom: 1000,
      strategy: 'Pace Chaser',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2,
      skills: ['110061'],
      randomMobId: 8256,
    });

    const result = runSkillComparison({
      trackedSkillId: '110061',
      nsamples: 64,
      course,
      racedef,
      runnerA,
      runnerB,
      options: createSimulationOptions(20260306),
    });

    expect(result.mean).toBeLessThan(0);
  });
});

describe('vacuum-compare simulator', () => {
  it('returns sorted basins and populated run snapshots', () => {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const uma1 = createRunnerState({ outfitId: '100101', strategy: 'Front Runner' });
    const uma2 = createRunnerState({ outfitId: '100201', strategy: 'Pace Chaser' });

    const params: CompareParams = {
      nsamples: 6,
      course,
      racedef,
      uma1,
      uma2,
      options: createSimulationOptions(991),
    };

    const result = runComparison(params);

    expect(result.results).toHaveLength(6);
    expect(result.results).toEqual([...result.results].sort((a, b) => a - b));
    expect(result.runData.meanrun.time[0].length).toBeGreaterThan(0);
    expect(result.runData.meanrun.time[1].length).toBeGreaterThan(0);
    expect(result.runData.meanrun.startDelay).toHaveLength(2);
    expect(result.runData.meanrun.hp[0].length).toBe(result.runData.meanrun.time[0].length);
    expect(result.rushedStats.uma1.frequency).toBeGreaterThanOrEqual(0);
    expect(result.rushedStats.uma1.frequency).toBeLessThanOrEqual(100);
    expect(result.staminaStats.uma1.fullSpurtRate).toBeGreaterThanOrEqual(0);
    expect(result.staminaStats.uma1.fullSpurtRate).toBeLessThanOrEqual(100);
    expect(result.firstUmaStats.uma1.firstPlaceRate).toBeGreaterThanOrEqual(0);
    expect(result.firstUmaStats.uma1.firstPlaceRate).toBeLessThanOrEqual(100);
  });

  it('keeps basin sign aligned with finish times for provided race presets', () => {
    const course = CourseHelpers.getCourse(10914);
    const racedef = racedefToParams(
      createRaceConditions({
        ground: 4,
        weather: 3,
        season: 1,
        time: 2,
      }),
    );

    const uma1 = createRunnerState({
      outfitId: '100602',
      speed: 1200,
      stamina: 900,
      power: 800,
      guts: 600,
      wisdom: 1000,
      strategy: 'Pace Chaser',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2,
      skills: ['110061', '200741', '201351', '200351'],
      randomMobId: 8256,
    });
    const uma2 = createRunnerState({
      outfitId: '100602',
      speed: 1200,
      stamina: 900,
      power: 800,
      guts: 600,
      wisdom: 1000,
      strategy: 'Pace Chaser',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2,
      skills: ['110061'],
      randomMobId: 8256,
    });

    const result = runComparison({
      nsamples: 64,
      course,
      racedef,
      uma1,
      uma2,
      options: createSimulationOptions(20260306),
    });

    const mean = result.results.reduce((sum, value) => sum + value, 0) / result.results.length;
    const meanRunUma1Time =
      result.runData.meanrun.time[0][result.runData.meanrun.time[0].length - 1];
    const meanRunUma2Time =
      result.runData.meanrun.time[1][result.runData.meanrun.time[1].length - 1];

    expect(meanRunUma1Time).toBeLessThan(meanRunUma2Time);
    expect(mean).toBeLessThan(0);
  });
});

describe('computePositionDiff', () => {
  it('returns a negative value when runner A finishes ahead with fewer frames', () => {
    const runnerAPosition = [100, 250, 400];
    const runnerBPosition = [80, 190, 300, 360];

    expect(computePositionDiff(runnerAPosition, runnerBPosition)).toBeLessThan(0);
  });

  it('returns a positive value when runner B finishes ahead with fewer frames', () => {
    const runnerAPosition = [90, 220, 330, 390];
    const runnerBPosition = [120, 270, 430];

    expect(computePositionDiff(runnerAPosition, runnerBPosition)).toBeGreaterThan(0);
  });

  it('returns a negative value when both have same frames and runner A is ahead', () => {
    const runnerAPosition = [100, 210, 320];
    const runnerBPosition = [90, 180, 300];

    expect(computePositionDiff(runnerAPosition, runnerBPosition)).toBeLessThan(0);
  });

  it('returns a positive value when both have same frames and runner B is ahead', () => {
    const runnerAPosition = [80, 170, 260];
    const runnerBPosition = [90, 200, 320];

    expect(computePositionDiff(runnerAPosition, runnerBPosition)).toBeGreaterThan(0);
  });

  it('returns zero when both runners have identical final position', () => {
    const runnerAPosition = [100, 200, 300];
    const runnerBPosition = [100, 200, 300];

    expect(computePositionDiff(runnerAPosition, runnerBPosition)).toBe(0);
  });

  it('throws when one of the position arrays is empty', () => {
    expect(() => computePositionDiff([], [100])).toThrow(
      'Position data is empty while computing position difference',
    );
    expect(() => computePositionDiff([100], [])).toThrow(
      'Position data is empty while computing position difference',
    );
  });
});

describe('forced skill positions', () => {
  const TEST_SKILL_ID = '10011';

  function runRaceAndCollectActivations(
    forcedPositions: Record<string, number> | undefined,
    skillIds: Array<string>,
    seed: number,
  ) {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const raceParameters = toSundayRaceParameters(racedef);

    const runner = createRunnerState({
      outfitId: '100101',
      strategy: 'Runaway',
      skills: skillIds,
    });

    const sortedSkills = runner.skills.toSorted(createSkillSorterByGroup(runner.skills));

    const collector = new BassinCollector();
    const createRunnerObj = toCreateRunner(runner, sortedSkills, forcedPositions);
    const race = createInitializedRace({
      course,
      raceParameters,
      settings: createCompareSettings(),
      duelingRates: DEFAULT_DUELING_RATES,
      skillSamples: 1,
      runner: createRunnerObj,
      observer: collector,
    });

    race.prepareRound(seed);
    race.run();

    const raceRunner = race.runners.values().toArray()[0];
    return {
      usedSkills: raceRunner.usedSkills,
      pendingSkills: raceRunner.pendingSkills,
      createRunnerObj,
    };
  }

  it('should include forcedPositions in CreateRunner when provided', () => {
    const runner = createRunnerState({
      outfitId: '100101',
      skills: [TEST_SKILL_ID],
    });

    const forcedPositions = { [TEST_SKILL_ID]: 500 };
    const createRunnerObj = toCreateRunner(runner, runner.skills, forcedPositions);

    expect(createRunnerObj.forcedPositions).toEqual(forcedPositions);
  });

  it('should not include forcedPositions in CreateRunner when not provided', () => {
    const runner = createRunnerState({
      outfitId: '100101',
      skills: [TEST_SKILL_ID],
    });

    const createRunnerObj = toCreateRunner(runner, runner.skills);

    expect(createRunnerObj.forcedPositions).toBeUndefined();
  });

  it('should produce different results with vs without forced positions', () => {
    const skillId = runawaySkillId;
    const runner = createRunnerState({
      outfitId: '100101',
      strategy: 'Front Runner',
      skills: [skillId],
    });
    const sortedSkills = runner.skills.toSorted(createSkillSorterByGroup(runner.skills));

    const withoutForced = toCreateRunner(runner, sortedSkills);
    const withForced = toCreateRunner(runner, sortedSkills, {
      [skillId]: 100,
    });

    expect(withoutForced.forcedPositions).toBeUndefined();
    expect(withForced.forcedPositions).toEqual({ [skillId]: 100 });
  });

  it('should override skill trigger position when forced position is set', () => {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const raceParameters = toSundayRaceParameters(racedef);

    const skillId = runawaySkillId;
    const forcedPos = 300;

    const runner = createRunnerState({
      outfitId: '100101',
      strategy: 'Runaway',
      skills: [skillId],
    });

    const sortedSkills = runner.skills.toSorted(createSkillSorterByGroup(runner.skills));

    const collector = new BassinCollector();
    const race = createInitializedRace({
      course,
      raceParameters,
      settings: createCompareSettings(),
      duelingRates: DEFAULT_DUELING_RATES,
      skillSamples: 1,
      runner: toCreateRunner(runner, sortedSkills, { [skillId]: forcedPos }),
      observer: collector,
    });

    race.prepareRound(42);

    const raceRunner = race.runners.values().toArray()[0];
    const pendingForSkill = raceRunner.pendingSkills.filter(
      (ps) => ps.skillId === skillId || ps.skillId.startsWith(skillId),
    );

    expect(pendingForSkill.length).toBeGreaterThan(0);
    for (const ps of pendingForSkill) {
      expect(ps.trigger.start).toBe(forcedPos);
    }
  });

  it('should activate skill at forced position changing race outcome', () => {
    const skillId = runawaySkillId;

    const withoutForced = runRaceAndCollectActivations(undefined, [skillId], 42);

    const withForced = runRaceAndCollectActivations({ [skillId]: 800 }, [skillId], 42);

    expect(withoutForced.createRunnerObj.forcedPositions).toBeUndefined();
    expect(withForced.createRunnerObj.forcedPositions).toEqual({ [skillId]: 800 });

    const naturalActivated = withoutForced.usedSkills.has(skillId);
    const forcedActivated = withForced.usedSkills.has(skillId);

    expect(forcedActivated).toBe(true);

    if (naturalActivated) {
      expect(withForced.usedSkills).toEqual(withoutForced.usedSkills);
    }
  });

  it('should produce different results when forced to different positions', () => {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());

    const impactfulSkillId = '200531';
    const uma1 = createRunnerState({
      outfitId: '100101',
      strategy: 'Runaway',
      skills: [impactfulSkillId],
    });
    const uma2 = createRunnerState({
      outfitId: '100201',
      strategy: 'Pace Chaser',
      skills: [],
    });

    const options = createSimulationOptions(42);

    const resultForcedEarly = runComparison({
      nsamples: 10,
      course,
      racedef,
      uma1,
      uma2,
      options,
      forcedPositions: {
        uma1: { [impactfulSkillId]: 50 },
        uma2: {},
      },
    });

    const resultForcedLate = runComparison({
      nsamples: 10,
      course,
      racedef,
      uma1,
      uma2,
      options,
      forcedPositions: {
        uma1: { [impactfulSkillId]: 1200 },
        uma2: {},
      },
    });

    expect(resultForcedEarly.results).not.toEqual(resultForcedLate.results);
  });

  it('respects forced trigger position for pace chaser skill 200741', () => {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const raceParameters = toSundayRaceParameters(racedef);
    const skillId = '200741';
    const seed = 2026;

    const runnerPreset = createRunnerState({
      outfitId: '100602',
      speed: 1200,
      stamina: 700,
      power: 900,
      guts: 500,
      wisdom: 1000,
      strategy: 'Pace Chaser',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 0,
      skills: ['110061', '201351', '200351', skillId],
    });

    const collectTriggerStarts = (forcedPositions?: Record<string, number>) => {
      const sortedSkills = runnerPreset.skills.toSorted(
        createSkillSorterByGroup(runnerPreset.skills),
      );
      const race = createInitializedRace({
        course,
        raceParameters,
        settings: createCompareSettings(),
        duelingRates: DEFAULT_DUELING_RATES,
        skillSamples: 1,
        runner: toCreateRunner(runnerPreset, sortedSkills, forcedPositions),
      });

      race.prepareRound(seed);

      const raceRunner = race.runners.values().toArray()[0];
      const pendingForSkill = raceRunner.pendingSkills.filter(
        (ps) => ps.skillId === skillId || ps.skillId.startsWith(skillId),
      );

      expect(pendingForSkill.length).toBeGreaterThan(0);
      return pendingForSkill.map((ps) => ps.trigger.start);
    };

    const naturalStarts = collectTriggerStarts();
    const forcedStarts = collectTriggerStarts({ [skillId]: 2000 });

    expect(forcedStarts.every((start) => start === 2000)).toBe(true);
    expect(naturalStarts.some((start) => start !== 2000)).toBe(true);
  });

  it('samples Swinging Maestro trigger from first eligible corner branch', () => {
    // CM: Pisces Cup
    const course = CourseHelpers.getCourse(10914); // Hanshin Turf 3200m
    const racedef = racedefToParams(
      createRaceConditions({
        mood: 0, // Not applied
        ground: 4, // Heavy Conditions
        weather: 3, // Rainy
        season: 1, // Spring
        time: 2, // Daytime
        grade: 100, // Grade 1 Race
      }),
    );
    const raceParameters = toSundayRaceParameters(racedef);
    const skillId = '200351'; // Swinging Maestro
    const baseSeed = 268010; // Seed from reported issue

    const runnerPreset = createRunnerState({
      outfitId: '100602', // [Ashen Miracle] Oguri Cap
      speed: 1200,
      stamina: 1100,
      power: 1100,
      guts: 600,
      wisdom: 1000,
      strategy: 'Pace Chaser',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2, // Great Mood
      skills: ['110061', skillId], // [Festive Miracle, Swinging Maestro]
      randomMobId: 8123,
    });

    const sortedSkills = runnerPreset.skills.toSorted(
      createSkillSorterByGroup(runnerPreset.skills),
    );
    const race = createInitializedRace({
      course,
      raceParameters,
      settings: createCompareSettings(),
      duelingRates: DEFAULT_DUELING_RATES,
      skillSamples: 1,
      runner: toCreateRunner(runnerPreset, sortedSkills),
    });

    const starts: Array<number> = [];
    for (let i = 0; i < 120; i++) {
      race.prepareRound(baseSeed + i);
      const raceRunner = race.runners.values().toArray()[0];
      const pendingForSkill = raceRunner.pendingSkills.filter(
        (ps) => ps.skillId === skillId || ps.skillId.startsWith(skillId),
      );
      expect(pendingForSkill).toHaveLength(1);
      starts.push(pendingForSkill[0].trigger.start);
    }

    const buckets = { c1: 0, c2: 0, c3: 0, c4: 0, other: 0 };
    for (const start of starts) {
      if (start >= 1520 && start < 1710) buckets.c1++;
      else if (start >= 1710 && start < 1900) buckets.c2++;
      else if (start >= 2250 && start < 2550) buckets.c3++;
      else if (start >= 2550 && start < 2850) buckets.c4++;
      else buckets.other++;
    }

    expect(buckets.c2 + buckets.c3 + buckets.c4 + buckets.other).toBe(0);
    expect(buckets.c1).toBe(starts.length);
    expect(new Set(starts).size).toBeGreaterThan(1);
  });
});

describe('injected debuffs', () => {
  const TEST_DEBUFF_SKILL_ID = '201082';

  it('includes injectedDebuffs in CreateRunner when provided', () => {
    const runner = createRunnerState({
      outfitId: '100101',
      skills: [],
    });

    const injectedDebuffs = [{ skillId: TEST_DEBUFF_SKILL_ID, position: 700 }];
    const createRunnerObj = (toCreateRunner as any)(
      runner,
      runner.skills,
      undefined,
      injectedDebuffs,
    );

    expect(createRunnerObj.injectedDebuffs).toEqual(injectedDebuffs);
  });

  it('does not include injectedDebuffs in CreateRunner when not provided', () => {
    const runner = createRunnerState({
      outfitId: '100101',
      skills: [],
    });

    const createRunnerObj = toCreateRunner(runner, runner.skills);
    expect((createRunnerObj as any).injectedDebuffs).toBeUndefined();
  });

  it('runComparison with injectedDebuffs produces different results than without', () => {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const uma1 = createRunnerState({
      outfitId: '100101',
      strategy: 'Runaway',
      skills: [],
    });
    const uma2 = createRunnerState({
      outfitId: '100201',
      strategy: 'Pace Chaser',
      skills: [],
    });

    const baseParams = {
      nsamples: 24,
      course,
      racedef,
      uma1,
      uma2,
      options: createSimulationOptions(4242),
    };

    const withoutDebuff = runComparison(baseParams);
    const withDebuff = runComparison({
      ...baseParams,
      injectedDebuffs: {
        uma1: [{ skillId: TEST_DEBUFF_SKILL_ID, position: 200 }],
        uma2: [],
      },
    } as any);

    expect(withDebuff.results).not.toEqual(withoutDebuff.results);
  });

  it('injected debuff at a fixed position slows the affected uma', () => {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const uma1 = createRunnerState({
      outfitId: '100101',
      strategy: 'Runaway',
      skills: [],
    });
    const uma2 = createRunnerState({
      outfitId: '100201',
      strategy: 'Pace Chaser',
      skills: [],
    });

    const withoutDebuff = runComparison({
      nsamples: 32,
      course,
      racedef,
      uma1,
      uma2,
      options: createSimulationOptions(5511),
    });

    const withDebuff = runComparison({
      nsamples: 32,
      course,
      racedef,
      uma1,
      uma2,
      options: createSimulationOptions(5511),
      injectedDebuffs: {
        uma1: [{ skillId: TEST_DEBUFF_SKILL_ID, position: 100 }],
        uma2: [],
      },
    } as any);

    const meanWithout =
      withoutDebuff.results.reduce((sum, value) => sum + value, 0) / withoutDebuff.results.length;
    const meanWith =
      withDebuff.results.reduce((sum, value) => sum + value, 0) / withDebuff.results.length;

    expect(meanWith).toBeGreaterThan(meanWithout);
  });
});

describe('last spurt activation', () => {
  const LATE_SURGER_COURSE_ID = 10504; // Nakayama Turf 2000m (Medium)

  function createLateSurgerRunner() {
    return createRunnerState({
      outfitId: '103701',
      speed: 1200,
      stamina: 800,
      power: 1100,
      guts: 550,
      wisdom: 1200,
      strategy: 'Late Surger',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2,
      skills: ['100371', '210061', '200331', '900271', '200362', '900061'],
      randomMobId: 8361,
    });
  }

  function createLateSurgerRace(seed: number) {
    const course = CourseHelpers.getCourse(LATE_SURGER_COURSE_ID);
    const racedef = racedefToParams(
      createRaceConditions({
        ground: 1,
        weather: 1,
        season: 1,
        time: 2,
        grade: 100,
      }),
    );
    const raceParameters = toSundayRaceParameters(racedef);
    const runner = createLateSurgerRunner();
    const sortedSkills = runner.skills.toSorted(createSkillSorterByGroup(runner.skills));

    const collector = new VacuumCompareDataCollector();
    const race = createInitializedRace({
      course,
      raceParameters,
      settings: createCompareSettings({ healthSystem: true }),
      duelingRates: DEFAULT_DUELING_RATES,
      skillSamples: 1,
      runner: toCreateRunner(runner, sortedSkills),
      observer: collector,
    });

    return { race, collector, course };
  }

  it('activates isLastSpurt immediately for max-spurt horse on entering phase 2', () => {
    const { race, course } = createLateSurgerRace(425546);
    race.prepareRound(425546);
    race.run();

    const raceRunner = race.runners.values().toArray()[0];
    const lateRaceStart = (course.distance * 2) / 3;

    expect(raceRunner.hasAchievedFullSpurt).toBe(true);
    expect(raceRunner.isLastSpurt).toBe(true);
    expect(raceRunner.lastSpurtTransition).toBe(-1);
    expect(raceRunner.lastSpurtSpeed).toBeGreaterThan(raceRunner.baseTargetSpeedPerPhase[2]);
    expect(raceRunner.position).toBeGreaterThan(lateRaceStart);
  });

  it('does not flatten velocity at late-race base target speed', () => {
    const { race, collector, course } = createLateSurgerRace(425546);
    race.prepareRound(425546);
    race.run();

    const raceRunner = race.runners.values().toArray()[0];
    const data = collector.getPrimaryRunnerRoundData()!;
    expect(data).not.toBeNull();

    const lateRaceStart = (course.distance * 2) / 3;
    const lateRaceBaseTarget = raceRunner.baseTargetSpeedPerPhase[2];

    const lateRaceFrames: Array<{ position: number; velocity: number }> = [];
    for (let i = 0; i < data.position.length; i++) {
      if (data.position[i] >= lateRaceStart) {
        lateRaceFrames.push({ position: data.position[i], velocity: data.velocity[i] });
      }
    }

    expect(lateRaceFrames.length).toBeGreaterThan(0);

    // With the fix, the runner should accelerate above lateRaceBaseTarget during late race.
    // If the bug were present, velocity would plateau at lateRaceBaseTarget.
    const maxVelocityInLateRace = Math.max(...lateRaceFrames.map((f) => f.velocity));
    expect(maxVelocityInLateRace).toBeGreaterThan(lateRaceBaseTarget + 0.5);

    // Verify the runner reaches near lastSpurtSpeed
    expect(maxVelocityInLateRace).toBeGreaterThan(raceRunner.lastSpurtSpeed * 0.95);
  });

  it('achieves full spurt at a plausible rate across multiple seeds', () => {
    const course = CourseHelpers.getCourse(LATE_SURGER_COURSE_ID);
    const racedef = racedefToParams(
      createRaceConditions({
        ground: 1,
        weather: 1,
        season: 1,
        time: 2,
        grade: 100,
      }),
    );
    const raceParameters = toSundayRaceParameters(racedef);
    const runner = createLateSurgerRunner();
    const sortedSkills = runner.skills.toSorted(createSkillSorterByGroup(runner.skills));

    const collector = new VacuumCompareDataCollector();
    const race = createInitializedRace({
      course,
      raceParameters,
      settings: createCompareSettings({ healthSystem: true }),
      duelingRates: DEFAULT_DUELING_RATES,
      skillSamples: 1,
      runner: toCreateRunner(runner, sortedSkills),
      observer: collector,
    });

    let fullSpurtCount = 0;
    const nsamples = 64;
    const baseSeed = 100000;

    for (let i = 0; i < nsamples; i++) {
      race.prepareRound(baseSeed + i);
      race.run();

      const raceRunner = race.runners.values().toArray()[0];
      if (raceRunner.hasAchievedFullSpurt) {
        fullSpurtCount++;
      }
    }

    const fullSpurtRate = fullSpurtCount / nsamples;
    // A Late Surger with 800 stamina on 2000m should achieve full spurt frequently
    expect(fullSpurtRate).toBeGreaterThan(0.3);
  });

  it('recalculates spurt correctly via forceState for non-max-spurt horse with HP recovery', () => {
    const course = CourseHelpers.getCourse(LATE_SURGER_COURSE_ID);
    const racedef = racedefToParams(
      createRaceConditions({
        ground: 1,
        weather: 1,
        season: 1,
        time: 2,
        grade: 100,
      }),
    );
    const raceParameters = toSundayRaceParameters(racedef);

    // Low stamina runner that is unlikely to achieve max spurt
    const lowStaminaRunner = createRunnerState({
      outfitId: '103701',
      speed: 1200,
      stamina: 300,
      power: 1100,
      guts: 550,
      wisdom: 1200,
      strategy: 'Late Surger',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2,
      skills: ['100371', '900061'],
      randomMobId: 8361,
    });

    const sortedSkills = lowStaminaRunner.skills.toSorted(
      createSkillSorterByGroup(lowStaminaRunner.skills),
    );

    const collector = new VacuumCompareDataCollector();
    const race = createInitializedRace({
      course,
      raceParameters,
      settings: createCompareSettings({ healthSystem: true }),
      duelingRates: DEFAULT_DUELING_RATES,
      skillSamples: 1,
      runner: toCreateRunner(lowStaminaRunner, sortedSkills),
      observer: collector,
    });

    race.prepareRound(425546);
    race.run();

    const raceRunner = race.runners.values().toArray()[0];

    // Low stamina runner should NOT achieve max spurt
    expect(raceRunner.hasAchievedFullSpurt).toBe(false);

    // But should still eventually enter last spurt (at the computed transition)
    expect(raceRunner.isLastSpurt).toBe(true);

    // The non-full-spurt bookkeeping should have been set
    expect(raceRunner.nonFullSpurtVelocityDiff).not.toBeNull();
    expect(raceRunner.nonFullSpurtDelayDistance).not.toBeNull();

    // Last spurt speed should be less than or equal to the max possible spurt speed
    expect(raceRunner.lastSpurtSpeed).toBeLessThanOrEqual(
      raceRunner.baseTargetSpeedPerPhase[2] + 5,
    );
    expect(raceRunner.lastSpurtTransition).toBeGreaterThan(0);
  });
});

describe('skill-planner-compare simulator', () => {
  it('is deterministic and returns sorted basinn deltas', () => {
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const runnerA = createRunnerState({ outfitId: '100101', skills: [] });
    const runnerB = cloneDeep(runnerA);
    runnerB.skills = [runawaySkillId];
    const options = createSimulationOptions(12345);

    const first = runPlannerComparison({
      nsamples: 10,
      course,
      racedef,
      runnerA,
      runnerB,
      candidateSkills: [runawaySkillId],
      options,
    });

    const second = runPlannerComparison({
      nsamples: 10,
      course,
      racedef,
      runnerA,
      runnerB,
      candidateSkills: [runawaySkillId],
      options,
    });

    expect(first.results).toEqual(second.results);
    expect(first.mean).toBe(second.mean);
    expect(first.median).toBe(second.median);
    expect(first.results).toEqual([...first.results].sort((a, b) => a - b));
  });

  it('keeps basin sign consistent when runnerA is faster than runnerB', () => {
    const course = CourseHelpers.getCourse(10914);
    const racedef = racedefToParams(
      createRaceConditions({
        ground: 4,
        weather: 3,
        season: 1,
        time: 2,
      }),
    );

    const runnerA = createRunnerState({
      outfitId: '100602',
      speed: 1200,
      stamina: 900,
      power: 800,
      guts: 600,
      wisdom: 1000,
      strategy: 'Pace Chaser',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2,
      skills: ['110061', '200741', '201351', '200351'],
      randomMobId: 8256,
    });
    const runnerB = createRunnerState({
      outfitId: '100602',
      speed: 1200,
      stamina: 900,
      power: 800,
      guts: 600,
      wisdom: 1000,
      strategy: 'Pace Chaser',
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      mood: 2,
      skills: ['110061'],
      randomMobId: 8256,
    });

    const result = runPlannerComparison({
      nsamples: 64,
      course,
      racedef,
      runnerA,
      runnerB,
      candidateSkills: ['110061'],
      options: createSimulationOptions(20260306),
    });

    expect(result.mean).toBeLessThan(0);
  });
});
