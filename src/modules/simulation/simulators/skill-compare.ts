/**
 * # Skill Comparison for Sunday's Shadow
 *
 * ## Overview
 *
 * This module is used to compare the performance of unacquired skills against a runner with the skill already acquired.
 *
 * The goal of this module is to provide a way so the user knows how much Bashins a skill provides to the runner if acquired.
 */

import { cloneDeep } from 'es-toolkit';
import type {
  Run1RoundParams,
  RunComparisonParams,
  SkillComparisonResponse,
} from '@/modules/simulation/types';
import type {
  SkillSimulationData,
  SkillSimulationRun,
  SkillTrackedMetaCollection,
} from '@/modules/simulation/compare.types';
import { initializeSkillSimulationRun } from '@/modules/simulation/compare.types';
import {
  BassinCollector,
  SkillCompareDataCollector,
} from '@/lib/sunday-tools/common/race-observer';
import {
  DEFAULT_DUELING_RATES,
  computePositionDiff,
  createCompareSettings,
  createInitializedRace,
  createSkillSorterByGroup,
  getFallbackEffectMeta,
  toCreateRunner,
  toSundayRaceParameters,
} from './shared';

export interface SkillComparisonResult {
  results: Array<number>;
  skillActivations: Record<string, SkillTrackedMetaCollection>;
  runData: SkillSimulationData;

  min: number;
  max: number;
  mean: number;
  median: number;
}

type SkillCompareParams = RunComparisonParams & {
  trackedSkillId: string;
};

export function runSkillComparison(params: SkillCompareParams): SkillComparisonResult {
  const { nsamples, course, racedef, runnerA, runnerB, trackedSkillId, options } = params;

  const seed = options.seed ?? 0;
  const skillSorter = createSkillSorterByGroup([...runnerA.skills, ...runnerB.skills]);
  const runnerASortedSkills = runnerA.skills.toSorted(skillSorter);
  const runnerBSortedSkills = runnerB.skills.toSorted(skillSorter);

  const raceParameters = toSundayRaceParameters(racedef);
  const settings = createCompareSettings();

  const fallbackEffectMeta = getFallbackEffectMeta(trackedSkillId);
  const collectorA = new BassinCollector();
  const collectorB = new SkillCompareDataCollector({
    trackedSkillId,
    fallbackEffectType: fallbackEffectMeta.effectType,
    fallbackEffectTarget: fallbackEffectMeta.effectTarget,
  });

  const raceA = createInitializedRace({
    course,
    raceParameters,
    settings,
    duelingRates: DEFAULT_DUELING_RATES,
    skillSamples: nsamples,
    runner: toCreateRunner(runnerA, runnerASortedSkills),
    collector: collectorA,
  });

  const raceB = createInitializedRace({
    course,
    raceParameters,
    settings,
    duelingRates: DEFAULT_DUELING_RATES,
    skillSamples: nsamples,
    runner: toCreateRunner(runnerB, runnerBSortedSkills),
    collector: collectorB,
  });

  const sign = 1;
  const diff: Array<number> = [];

  let min = Infinity;
  let max = -Infinity;
  let estMean = 0;
  let estMedian = 0;
  let bestMeanDiff = Infinity;
  let bestMedianDiff = Infinity;

  let minrun: SkillSimulationRun = initializeSkillSimulationRun();
  let maxrun: SkillSimulationRun = initializeSkillSimulationRun();
  let meanrun: SkillSimulationRun = initializeSkillSimulationRun();
  let medianrun: SkillSimulationRun = initializeSkillSimulationRun();

  const sampleCutoff = Math.max(Math.floor(nsamples * 0.8), nsamples - 200);

  for (let i = 0; i < nsamples; ++i) {
    const sampleSeed = seed + i;
    raceA.prepareRound(sampleSeed);
    raceB.prepareRound(sampleSeed);
    raceA.run();
    raceB.run();

    const baselinePosition = collectorA.getPosition();
    const roundB = collectorB.getPrimaryRunnerRoundData();

    if (baselinePosition.length === 0 || !roundB) {
      throw new Error('Missing collected runner data for skill comparison');
    }

    const positionDiff = computePositionDiff(baselinePosition, roundB.position);
    const basinn = (sign * positionDiff) / 2.5;
    collectorB.finalizeCurrentTrackedMeta(basinn);

    const data: SkillSimulationRun = collectorB.buildCurrentSkillRun();

    diff.push(basinn);

    if (basinn < min) {
      min = basinn;
      minrun = data;
    }

    if (basinn > max) {
      max = basinn;
      maxrun = data;
    }

    if (i === sampleCutoff) {
      diff.sort((a, b) => a - b);

      estMean = diff.reduce((a, b) => a + b) / diff.length;

      const mid = Math.floor(diff.length / 2);
      estMedian = mid > 0 && diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
    }

    if (i >= sampleCutoff) {
      const meanDiff = Math.abs(basinn - estMean);
      const medianDiff = Math.abs(basinn - estMedian);

      if (meanDiff < bestMeanDiff) {
        bestMeanDiff = meanDiff;
        meanrun = data;
      }

      if (medianDiff < bestMedianDiff) {
        bestMedianDiff = medianDiff;
        medianrun = data;
      }
    }
  }

  diff.sort((a, b) => a - b);

  const mid = Math.floor(diff.length / 2);
  const median = diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
  const mean = diff.reduce((a, b) => a + b) / diff.length;

  const trackedMetaCollection = collectorB.getTrackedMetaCollection();
  const skillActivations =
    trackedMetaCollection.length > 0 ? { [trackedSkillId]: trackedMetaCollection } : {};

  return {
    results: diff,
    skillActivations,
    runData: { minrun, maxrun, meanrun, medianrun },

    min: diff[0],
    max: diff[diff.length - 1],
    mean,
    median,
  };
}

export const runSampling = (params: Run1RoundParams): SkillComparisonResponse => {
  const { nsamples, skills, course, racedef, uma, options } = params;

  const data: SkillComparisonResponse = {};

  for (const id of skills) {
    const runnerWithTrackedSkill = cloneDeep(uma);
    runnerWithTrackedSkill.skills.push(id);

    const { results, runData, min, max, mean, median, skillActivations } = runSkillComparison({
      trackedSkillId: id,
      nsamples,
      course,
      racedef,
      runnerA: uma,
      runnerB: runnerWithTrackedSkill,
      options,
    });

    data[id] = {
      id,
      results,
      skillActivations,
      runData,
      min,
      max,
      mean,
      median,
      filterReason: undefined,
    };
  }

  return data;
};
