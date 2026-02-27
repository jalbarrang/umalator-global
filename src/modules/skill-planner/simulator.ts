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

import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { SimulationOptions } from '@/modules/simulation/types';
import { runPlannerComparison } from '@/modules/simulation/simulators/skill-planner-compare';

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

  const result = runPlannerComparison({
    nsamples,
    course,
    racedef,
    runnerA: baseRunner,
    runnerB: {
      ...baseRunner,
      skills: [...baseRunner.skills, ...candidateSkills],
    },
    candidateSkills,
    options,
  });

  return {
    results: result.results,
    min: result.min,
    max: result.max,
    mean: result.mean,
    median: result.median,
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
