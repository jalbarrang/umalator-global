/**
 * Web Worker for running simulations
 */

import { clone, cloneDeepWith } from 'es-toolkit';
import { mergeResultSets } from './utils';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';

import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { Run1RoundParams, SimulationOptions } from '@/modules/simulation/types';
import { runSampling } from '@/modules/simulation/simulators/skill-compare';

type PrepareRoundParams = {
  courseData: CourseData;
  raceParams: RaceParameters;
  runner: RunnerState;
  options: SimulationOptions;
};

/**
 * Utility function to prepare round parameters for the skill basin simulation.
 */
function prepareRounds(params: PrepareRoundParams) {
  return (nsamples: number, newSkills: Array<string>): Run1RoundParams => {
    return {
      course: params.courseData,
      racedef: params.raceParams,
      uma: params.runner,
      options: params.options,
      nsamples: nsamples,
      skills: newSkills,
    };
  };
}

type RunChartParams = {
  skills: Array<string>;
  course: CourseData;
  racedef: RaceParameters;
  uma: RunnerState;
  options: SimulationOptions;
};

function runChart(params: RunChartParams) {
  const { skills, course, racedef, uma, options } = params;

  // Copy over the skills to avoid mutating the original list
  let newSkills = clone(skills);

  // Copy over the base runner to avoid mutating the original
  const baseRunner = cloneDeepWith(uma, (value, key) => {
    if (key === 'skills') return clone(value);
  });

  const roundParamGenerator = prepareRounds({
    courseData: course,
    raceParams: racedef,
    runner: baseRunner,
    options: options,
  });

  const results = runSampling(roundParamGenerator(5, newSkills));
  postMessage({ type: 'skill-bassin', results: results });

  // Stage 1 filter: mark skills with negligible effect
  newSkills = newSkills.filter((skillId) => {
    const result = results[skillId];

    if (result && result.max <= 0.1) {
      result.filterReason = 'negligible-effect';
      return false;
    }

    return true;
  });

  const firstUpdate = runSampling(roundParamGenerator(20, newSkills));
  mergeResultSets(results, firstUpdate);
  postMessage({ type: 'skill-bassin', results: results });

  // Stage 2 filter: mark skills with low variance
  newSkills = newSkills.filter((skillId) => {
    const result = results[skillId];

    if (result && Math.abs(result.max - result.min) <= 0.1) {
      result.filterReason = 'low-variance';
      return false;
    }
    return true;
  });

  const secondUpdate = runSampling(roundParamGenerator(50, newSkills));
  mergeResultSets(results, secondUpdate);
  postMessage({ type: 'skill-bassin', results: results });

  // Final update
  const finalUpdate = runSampling(roundParamGenerator(200, newSkills));
  mergeResultSets(results, finalUpdate);
  postMessage({ type: 'skill-bassin', results: results });

  // Done
  postMessage({ type: 'skill-bassin-done' });
}

self.addEventListener('message', (e: MessageEvent) => {
  const { msg, data } = e.data;

  switch (msg) {
    case 'chart':
      runChart(data);
      break;
  }
});
