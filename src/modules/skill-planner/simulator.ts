/**
 * # Skill Planner Simulator
 *
 * ## Overview
 *
 * This module evaluates skill combinations for the skill planner by comparing
 * a baseline runner (with obtained skills) against runners with additional candidate skills.
 *
 * The goal is to determine how much performance gain (in bashins) each skill combination provides.
 */

import { cloneDeep } from 'es-toolkit';
import type { RaceSolver } from '@/modules/simulation/lib/core/RaceSolver';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from '@/modules/simulation/lib/course/definitions';
import type { SimulationOptions } from '@/modules/simulation/types';
import type { RaceParameters } from '@/modules/simulation/lib/definitions';
import {
  RaceSolverBuilder,
  buildAdjustedStats,
  buildBaseStats,
} from '@/modules/simulation/lib/core/RaceSolverBuilder';
import { PosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import { SkillPerspective } from '@/modules/simulation/lib/skills/definitions';
import { getSkillMetaById } from '@/modules/skills/utils';

interface SkillCombinationComparisonParams {
  nsamples: number;
  course: CourseData;
  racedef: RaceParameters;
  baseRunner: RunnerState;
  candidateSkills: Array<string>;
  options: SimulationOptions;
}

interface SkillCombinationComparisonResult {
  results: Array<number>;
  min: number;
  max: number;
  mean: number;
  median: number;
}

/**
 * Compare a baseline runner against a runner with additional candidate skills
 */
export function runSkillCombinationComparison(
  params: SkillCombinationComparisonParams,
): SkillCombinationComparisonResult {
  const { nsamples, course, racedef, baseRunner, candidateSkills, options } = params;

  const seed = options.seed ?? 0;
  const posKeepMode = options.posKeepMode ?? PosKeepMode.None;
  const numUmas = racedef.numUmas ?? 1;

  // Create test runner with candidate skills added
  const testRunner = cloneDeep(baseRunner);
  testRunner.skills = [...baseRunner.skills, ...candidateSkills];

  // Set up base runner solver
  const baseRaceSolver = new RaceSolverBuilder(nsamples)
    .seed(seed)
    .course(course)
    .ground(racedef.groundCondition)
    .weather(racedef.weather)
    .season(racedef.season)
    .time(racedef.time)
    .useHpPolicy(false)
    .accuracyMode(options.accuracyMode ?? false)
    .posKeepMode(posKeepMode)
    .mode('skill-compare');

  if (racedef.orderRange) {
    const [start, end] = racedef.orderRange;
    baseRaceSolver.order(start, end).numUmas(numUmas);
  }

  // Fork to share RNG - both runners face the same random events for fair comparison
  const testRaceSolver = baseRaceSolver.fork();

  baseRaceSolver.trackedRunner(baseRunner);
  testRaceSolver.trackedRunner(testRunner);

  // Apply rushed toggles
  baseRaceSolver.disableRushed();
  testRaceSolver.disableRushed();

  // Apply downhill toggles
  baseRaceSolver.disableDownhill();
  testRaceSolver.disableDownhill();

  baseRaceSolver.disableSectionModifier();
  testRaceSolver.disableSectionModifier();

  // Apply skill check chance toggle
  baseRaceSolver.skillCheckChance(false);
  testRaceSolver.skillCheckChance(false);

  // Ensure skills common to both runners are added in the same order for RNG sync
  // Sort by groupId so that white and gold versions of a skill get added in the same order
  const commonSkillsArray = [...baseRunner.skills, ...testRunner.skills].toSorted(
    (a, b) => +a - +b,
  );
  const commonSkills = Array.from(new Set(commonSkillsArray));

  // Get groupIds for common skills
  const getCommonGroupIndex = (id: string) => {
    try {
      const baseId = id.split('-')[0];
      const groupId = getSkillMetaById(baseId).groupId;
      const index = commonSkills.findIndex((skillId) => {
        const commonBaseId = skillId.split('-')[0];
        return getSkillMetaById(commonBaseId).groupId === groupId;
      });
      return index > -1 ? index : commonSkills.length;
    } catch {
      // If skill meta not found, sort to end
      return commonSkills.length;
    }
  };

  // Sort by groupId first (for white/gold versions), then by skill ID
  const skillSorterByGroup = (a: string, b: string) => {
    const groupIndexA = getCommonGroupIndex(a);
    const groupIndexB = getCommonGroupIndex(b);
    if (groupIndexA !== groupIndexB) {
      return groupIndexA - groupIndexB;
    }
    // If same group, sort by skill ID
    return +a.split('-')[0] - +b.split('-')[0];
  };

  const baseRunnerBaseStats = buildBaseStats({ ...baseRunner });
  const baseRunnerAdjustedStats = buildAdjustedStats(
    baseRunnerBaseStats,
    course,
    racedef.groundCondition,
  );
  const baseRunnerWit = baseRunnerAdjustedStats.wisdom;

  const testRunnerBaseStats = buildBaseStats({ ...testRunner });
  const testRunnerAdjustedStats = buildAdjustedStats(
    testRunnerBaseStats,
    course,
    racedef.groundCondition,
  );
  const testRunnerWit = testRunnerAdjustedStats.wisdom;

  const baseRunnerSortedSkills = baseRunner.skills.toSorted(skillSorterByGroup);

  for (const id of baseRunnerSortedSkills) {
    const skillId = id.split('-')[0];
    const forcedPos = baseRunner.forcedSkillPositions[id];

    if (forcedPos) {
      baseRaceSolver.addSkillAtPosition(skillId, forcedPos, SkillPerspective.Self);
      testRaceSolver.addSkill(skillId, SkillPerspective.Other, undefined, baseRunnerWit);
    } else {
      baseRaceSolver.addSkill(skillId, SkillPerspective.Self);
      testRaceSolver.addSkill(skillId, SkillPerspective.Other, undefined, baseRunnerWit);
    }
  }

  const testRunnerSortedSkills = testRunner.skills.toSorted(skillSorterByGroup);

  for (const id of testRunnerSortedSkills) {
    const skillId = id.split('-')[0];
    const forcedPos = testRunner.forcedSkillPositions[id];

    if (forcedPos != null) {
      testRaceSolver.addSkillAtPosition(skillId, forcedPos, SkillPerspective.Self);
      baseRaceSolver.addSkill(skillId, SkillPerspective.Other, undefined, testRunnerWit);
    } else {
      testRaceSolver.addSkill(skillId, SkillPerspective.Self);
      baseRaceSolver.addSkill(skillId, SkillPerspective.Other, undefined, testRunnerWit);
    }
  }

  const builderBase = baseRaceSolver.build();
  const builderTest = testRaceSolver.build();

  const sign = 1;
  const diff = [];

  let min = Infinity;
  let max = -Infinity;

  let retry = false;

  // ===============================================
  // Sample Loop
  // ===============================================

  for (let i = 0; i < nsamples; ++i) {
    const solverBase = builderBase.next(retry).value as RaceSolver;
    const solverTest = builderTest.next(retry).value as RaceSolver;

    // Solver Base faces solver Test
    solverBase.initUmas([solverTest]);
    // Solver Test faces solver Base
    solverTest.initUmas([solverBase]);

    let solverBaseFinished = false;
    let solverTestFinished = false;
    // Difference in position between solver Base and solver Test
    let positionDiff = 0;

    while (!solverBaseFinished || !solverTestFinished) {
      // Update solver Test
      if (solverTest.pos < course.distance) {
        // Step solver Test for 1/15 seconds
        solverTest.step(1 / 15);
      } else if (!solverTestFinished) {
        // Solver Test has finished the race
        solverTestFinished = true;

        if (!solverBaseFinished) {
          positionDiff = solverTest.pos - solverBase.pos;
        }
      }

      // Update solver Base
      if (solverBase.pos < course.distance) {
        // Step solver Base for 1/15 seconds
        solverBase.step(1 / 15);
      } else if (!solverBaseFinished) {
        // Solver Base has finished the race
        solverBaseFinished = true;

        if (!solverTestFinished) {
          positionDiff = solverBase.pos - solverTest.pos;
        }
      }
    }

    retry = false;

    // Cleanup AFTER stat tracking
    solverTest.cleanup();
    solverBase.cleanup();

    const basinn = (sign * positionDiff) / 2.5;

    diff.push(basinn);

    if (basinn < min) {
      min = basinn;
    }

    if (basinn > max) {
      max = basinn;
    }
  }

  // ===============================================
  // Calculate Statistics
  // ===============================================

  diff.sort((a, b) => a - b);

  const mid = Math.floor(diff.length / 2);
  const median = diff.length % 2 == 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
  const mean = diff.reduce((a, b) => a + b) / diff.length;

  return {
    results: diff,
    min: diff[0],
    max: diff[diff.length - 1],
    mean,
    median,
  };
}

type SkillPlannerSimulationParams = {
  nsamples: number;
  course: CourseData;
  racedef: RaceParameters;
  baseRunner: RunnerState;
  options: SimulationOptions;
  skillCombinations: Array<Array<string>>;
};

type CombinationSimulationResult = {
  skills: Array<string>;
  bashin: number;
  min: number;
  max: number;
  median: number;
};

type BatchSimulationResult = {
  totalSimulations: number;
  results: Array<CombinationSimulationResult>;
};

/**
 * Evaluate multiple skill combinations in batch
 */
export function runBatchSkillEvaluation(
  params: SkillPlannerSimulationParams,
): BatchSimulationResult {
  const results: Array<CombinationSimulationResult> = [];

  for (const combination of params.skillCombinations) {
    const result = runSkillCombinationComparison({
      nsamples: params.nsamples,
      course: params.course,
      racedef: params.racedef,
      baseRunner: params.baseRunner,
      candidateSkills: combination,
      options: params.options,
    });

    results.push({
      skills: combination,
      bashin: result.mean,
      min: result.min,
      max: result.max,
      median: result.median,
    });
  }

  return {
    results,
    totalSimulations: params.skillCombinations.length * params.nsamples,
  };
}
