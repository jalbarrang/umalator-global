import { describe, expect, it } from 'vitest';
import { cloneDeep } from 'es-toolkit';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { createRunnerState, runawaySkillId } from '@/modules/runners/components/runner-card/types';
import { createRaceConditions, racedefToParams } from '@/utils/races';
import type { CompareParams, SimulationOptions } from '@/modules/simulation/types';
import { runSkillComparison } from './skill-compare';
import { runPlannerComparison } from './skill-planner-compare';
import { runComparison } from './vacuum-compare';

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
