/**
 * Web Worker for running simulations
 */

import type { CourseData } from '@simulation/lib/CourseData';
import type { RaceParameters } from '@simulation/lib/RaceParameters';

import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { runComparison } from '@/utils/compare';
import assert from 'assert';
import { PosKeepMode } from './modules/simulation/lib/RaceSolver';

// Maximum number of results to keep for histogram display
const MAX_RESULTS_TO_KEEP = 100;

function mergeResults(results1, results2) {
  assert(
    results1.id == results2.id,
    `mergeResults: ${results1.id} != ${results2.id}`,
  );

  const n1 = results1.sampleCount ?? results1.results.length;
  const n2 = results2.sampleCount ?? results2.results.length;
  const totalSamples = n1 + n2;

  // Combine and sort results
  const combinedResults = results1.results
    .concat(results2.results)
    .sort((a, b) => a - b);

  // Keep only a subset of results for histogram display to limit memory
  const sampledResults =
    combinedResults.length > MAX_RESULTS_TO_KEEP
      ? sampleArray(combinedResults, MAX_RESULTS_TO_KEEP)
      : combinedResults;

  const combinedMean = (results1.mean * n1 + results2.mean * n2) / totalSamples;
  const mid = Math.floor(combinedResults.length / 2);
  const newMedian =
    combinedResults.length % 2 == 0
      ? (combinedResults[mid - 1] + combinedResults[mid]) / 2
      : combinedResults[mid];

  const newMin = Math.min(results1.min, results2.min);
  const newMax = Math.max(results1.max, results2.max);

  // Only keep meanrun for chart mode to save memory
  // Determine which run is closer to the new mean
  const meanrun =
    n2 > n1 ? results2.runData?.meanrun : results1.runData?.meanrun;

  // Clear old results arrays to help GC
  results1.results.length = 0;
  results2.results.length = 0;

  return {
    id: results1.id,
    results: sampledResults,
    sampleCount: totalSamples, // Track actual sample count separately
    min: newMin,
    max: newMax,
    mean: combinedMean,
    median: newMedian,
    runData: meanrun ? { meanrun } : null,
  };
}

// Sample evenly from a sorted array to get representative distribution
function sampleArray(arr: number[], targetSize: number): number[] {
  if (arr.length <= targetSize) return arr;

  const result: number[] = [];
  const step = (arr.length - 1) / (targetSize - 1);

  for (let i = 0; i < targetSize; i++) {
    const idx = Math.round(i * step);
    result.push(arr[idx]);
  }

  return result;
}

function mergeResultSets(data1, data2) {
  data2.forEach((r, id) => {
    data1.set(id, mergeResults(data1.get(id), r));
  });
}

function run1Round(
  nsamples: number,
  skills: string[],
  course: CourseData,
  racedef: RaceParameters,
  uma: RunnerState,
  pacer: RunnerState,
  options,
) {
  const data = new Map();
  skills.forEach((id) => {
    const withSkill = { ...uma, skills: [...uma.skills, id] };

    const { results, runData } = runComparison(
      nsamples,
      course,
      racedef,
      uma,
      withSkill,
      pacer,
      options,
    );
    const mid = Math.floor(results.length / 2);
    const median =
      results.length % 2 == 0
        ? (results[mid - 1] + results[mid]) / 2
        : results[mid];
    const mean = results.reduce((a, b) => a + b, 0) / results.length;

    // Only keep meanrun to reduce memory usage in chart mode
    // Clear the other run data references
    const lightRunData = runData?.meanrun ? { meanrun: runData.meanrun } : null;

    data.set(id, {
      id,
      results,
      sampleCount: results.length,
      min: results[0],
      max: results[results.length - 1],
      mean,
      median,
      runData: lightRunData,
    });
  });
  return data;
}

interface SimulationOptions {
  seed?: number;
  useEnhancedSpurt?: boolean;
  accuracyMode?: boolean;
  posKeepMode?: PosKeepMode;
  mode?: string;
}

type RunChartParams = {
  skills: string[];
  course: CourseData;
  racedef: RaceParameters;
  uma: RunnerState;
  pacer: RunnerState;
  options: SimulationOptions;
};

function runChart(params: RunChartParams) {
  const { skills, course, racedef, uma, pacer, options } = params;

  let newSkills = [...skills];

  const uma_ = {
    ...uma,
    skills: [...uma.skills],
    forcedSkillPositions: { ...uma.forcedSkillPositions },
  };

  let pacer_: RunnerState | null = null;

  if (pacer) {
    pacer_ = {
      ...pacer,
      skills: [...pacer.skills],
      forcedSkillPositions: { ...pacer.forcedSkillPositions },
    };
  }

  const results = run1Round(
    5,
    newSkills,
    course,
    racedef,
    uma_,
    pacer_,
    options,
  );

  postMessage({ type: 'chart', results });

  newSkills = newSkills.filter((id) => results.get(id).max > 0.1);

  let update = run1Round(20, newSkills, course, racedef, uma_, pacer_, options);
  mergeResultSets(results, update);
  postMessage({ type: 'chart', results });

  newSkills = newSkills.filter(
    (id) => Math.abs(results.get(id).max - results.get(id).min) > 0.1,
  );

  update = run1Round(50, newSkills, course, racedef, uma_, pacer_, options);
  mergeResultSets(results, update);
  postMessage({ type: 'chart', results });

  update = run1Round(200, newSkills, course, racedef, uma_, pacer_, options);
  mergeResultSets(results, update);

  postMessage({ type: 'chart', results });
  postMessage({ type: 'chart-complete' });
}

type CompareParams = {
  nsamples: number;
  course: CourseData;
  racedef: RaceParameters;
  uma1: RunnerState;
  uma2: RunnerState;
  pacer: RunnerState;
  options: SimulationOptions;
};

function runCompare(params: CompareParams) {
  const { nsamples, course, racedef, uma1, uma2, pacer, options } = params;

  const uma1_ = {
    ...uma1,
    skills: [...uma1.skills],
    forcedSkillPositions: { ...uma1.forcedSkillPositions },
  };

  const uma2_ = {
    ...uma2,
    skills: [...uma2.skills],
    forcedSkillPositions: { ...uma2.forcedSkillPositions },
  };

  let pacer_: RunnerState | null = null;
  if (pacer) {
    pacer_ = {
      ...pacer,
      skills: [...pacer.skills],
      forcedSkillPositions: { ...pacer.forcedSkillPositions },
    };
  }

  const compareOptions = { ...options, mode: 'compare' };

  for (
    let n = Math.min(20, nsamples), mul = 6;
    n < nsamples;
    n = Math.min(n * mul, nsamples), mul = Math.max(mul - 1, 2)
  ) {
    const results = runComparison(
      n,
      course,
      racedef,
      uma1_,
      uma2_,
      pacer_,
      compareOptions,
    );

    postMessage({ type: 'compare', results });
  }

  const results = runComparison(
    nsamples,
    course,
    racedef,
    uma1_,
    uma2_,
    pacer_,
    compareOptions,
  );

  postMessage({ type: 'compare', results });
  postMessage({ type: 'compare-complete' });
}

self.addEventListener('message', (e: MessageEvent) => {
  const { msg, data } = e.data;

  switch (msg) {
    case 'chart':
      runChart(data);
      break;
    case 'compare':
      runCompare(data);
      break;
  }
});
