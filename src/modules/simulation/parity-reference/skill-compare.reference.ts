/**
 * PARITY REFERENCE — TEST-ONLY. Not in the production path.
 *
 * TS-engine skill-comparison oracle (mirrors the live `simulators/wasm-skill-compare.ts`).
 * See this directory's README and ADR-0004. Production runs 100% on WASM.
 */
import { cloneDeep } from 'es-toolkit';
import type {
  Run1RoundParams,
  RunComparisonParams,
  SkillComparisonResponse
} from '@/modules/simulation/types';
import type { SkillSimulationRun } from '@/modules/simulation/compare.types';
import { initializeSkillSimulationRun } from '@/modules/simulation/compare.types';
import { BassinCollector, SkillCompareDataCollector } from 'sunday-tools/common/race-observer';
import {
  DEFAULT_DUELING_RATES,
  computePositionDiff,
  createSkillSorterByGroup,
  getFallbackEffectMeta,
  toCreateRunner,
  toSundayRaceParameters
} from '@/modules/simulation/simulators/shared';
import {
  createSkillCompareSettings,
  type SkillComparisonResult
} from '@/modules/simulation/simulators/skill-compare';
import { createInitializedRace } from './ts-engine-harness';

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
  const settings = createSkillCompareSettings(options);

  const fallbackEffectMeta = getFallbackEffectMeta(trackedSkillId);
  const collectorA = new BassinCollector();
  const collectorB = new SkillCompareDataCollector({
    trackedSkillId,
    fallbackEffectType: fallbackEffectMeta.effectType,
    fallbackEffectTarget: fallbackEffectMeta.effectTarget
  });

  const raceA = createInitializedRace({
    course,
    raceParameters,
    settings,
    duelingRates: DEFAULT_DUELING_RATES,
    skillSamples: nsamples,
    runner: toCreateRunner(runnerA, runnerASortedSkills),
    observer: collectorA
  });

  const raceB = createInitializedRace({
    course,
    raceParameters,
    settings,
    duelingRates: DEFAULT_DUELING_RATES,
    skillSamples: nsamples,
    runner: toCreateRunner(runnerB, runnerBSortedSkills),
    observer: collectorB
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
    median
  };
}

const runSampling = (params: Run1RoundParams): SkillComparisonResponse => {
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
      options
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
      filterReason: undefined
    };
  }

  return data;
};
