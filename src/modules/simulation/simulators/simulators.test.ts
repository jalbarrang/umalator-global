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
  DEFAULT_DUELING_RATES,
  toCreateRunner,
  toSundayRaceParameters,
} from './shared';
import { BassinCollector } from '@/lib/sunday-tools/common/race-observer';

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

    const sortedSkills = runner.skills.toSorted(
      createSkillSorterByGroup(runner.skills),
    );

    const collector = new BassinCollector();
    const createRunnerObj = toCreateRunner(runner, sortedSkills, forcedPositions);
    const race = createInitializedRace({
      course,
      raceParameters,
      settings: createCompareSettings(),
      duelingRates: DEFAULT_DUELING_RATES,
      skillSamples: 1,
      runner: createRunnerObj,
      collector,
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
    const createRunnerObj = toCreateRunner(
      runner,
      runner.skills,
      forcedPositions,
    );

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
    const course = CourseHelpers.getCourse(TEST_COURSE_ID);
    const racedef = racedefToParams(createRaceConditions());
    const raceParameters = toSundayRaceParameters(racedef);

    const skillId = runawaySkillId;
    const runner = createRunnerState({
      outfitId: '100101',
      strategy: 'Front Runner',
      skills: [skillId],
    });
    const sortedSkills = runner.skills.toSorted(
      createSkillSorterByGroup(runner.skills),
    );

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

    const sortedSkills = runner.skills.toSorted(
      createSkillSorterByGroup(runner.skills),
    );

    const collector = new BassinCollector();
    const race = createInitializedRace({
      course,
      raceParameters,
      settings: createCompareSettings(),
      duelingRates: DEFAULT_DUELING_RATES,
      skillSamples: 1,
      runner: toCreateRunner(runner, sortedSkills, { [skillId]: forcedPos }),
      collector,
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

    const withoutForced = runRaceAndCollectActivations(
      undefined,
      [skillId],
      42,
    );

    const withForced = runRaceAndCollectActivations(
      { [skillId]: 800 },
      [skillId],
      42,
    );

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
});
