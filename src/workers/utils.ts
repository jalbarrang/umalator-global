import { merge } from 'es-toolkit';
import type { SkillSimulationData } from '@/modules/simulation/compare.types';
import type {
  SkillComparisonResponse,
  SkillComparisonRoundResult,
} from '@/modules/simulation/types';

export const mergeSkillResults = (
  resultA: SkillComparisonRoundResult,
  resultB: SkillComparisonRoundResult,
) => {
  const countA = resultA.results.length;
  const countB = resultB.results.length;

  const combinedResults = resultA.results.concat(resultB.results).toSorted((a, b) => a - b);

  const combinedMean = (resultA.mean * countA + resultB.mean * countB) / (countA + countB);
  const mid = Math.floor(combinedResults.length / 2);
  const newMedian =
    combinedResults.length % 2 == 0
      ? (combinedResults[mid - 1] + combinedResults[mid]) / 2
      : combinedResults[mid];

  const selectedRunData = countB > countA ? resultB.runData : resultA.runData;
  const minrun = resultA.min < resultB.min ? resultA.runData.minrun : resultB.runData.minrun;
  const maxrun = resultA.max > resultB.max ? resultA.runData.maxrun : resultB.runData.maxrun;

  const mergedRunData: SkillSimulationData = merge(selectedRunData, {
    minrun,
    maxrun,
  });

  const activations = merge(resultA.skillActivations, resultB.skillActivations);

  return {
    id: resultA.id,

    results: combinedResults,
    runData: mergedRunData,
    skillActivations: activations,

    min: Math.min(resultA.min, resultB.min),
    max: Math.max(resultA.max, resultB.max),
    mean: combinedMean,
    median: newMedian,

    filterReason: resultB.filterReason ?? resultA.filterReason,
  };
};

export const mergeResults = (
  resultA: SkillComparisonRoundResult,
  resultB: SkillComparisonRoundResult,
) => {
  if (resultA.id !== resultB.id) {
    throw new Error(`mergeResults: ${resultA.id} != ${resultB.id}`);
  }

  const resultSizeA = resultA.results.length;
  const resultSizeB = resultB.results.length;

  const combinedResults = resultA.results.concat(resultB.results).toSorted((a, b) => a - b);

  const combinedMean =
    (resultA.mean * resultSizeA + resultB.mean * resultSizeB) / (resultSizeA + resultSizeB);

  const mid = Math.floor(combinedResults.length / 2);

  const newMedian =
    combinedResults.length % 2 == 0
      ? (combinedResults[mid - 1] + combinedResults[mid]) / 2
      : combinedResults[mid];

  const selectedRunData = resultSizeB > resultSizeA ? resultB.runData : resultA.runData;
  const minrun = resultA.min < resultB.min ? resultA.runData.minrun : resultB.runData.minrun;
  const maxrun = resultA.max > resultB.max ? resultA.runData.maxrun : resultB.runData.maxrun;

  const mergedRunData: SkillSimulationData = merge(selectedRunData, {
    minrun,
    maxrun,
  });

  const activations = merge(resultA.skillActivations, resultB.skillActivations);

  return {
    id: resultA.id,

    results: combinedResults,
    skillActivations: activations,
    runData: mergedRunData,

    min: Math.min(resultA.min, resultB.min),
    max: Math.max(resultA.max, resultB.max),
    mean: combinedMean,
    median: newMedian,

    // Preserve filterReason from either result (newer result takes precedence)
    filterReason: resultB.filterReason ?? resultA.filterReason,
  };
};

export const mergeResultSets = (
  resultSetA: SkillComparisonResponse,
  resultSetB: SkillComparisonResponse,
) => {
  Object.entries(resultSetB).forEach(([id, resultB]) => {
    const resultA = resultSetA[id];

    if (resultA) {
      resultSetA[id] = mergeSkillResults(resultA, resultB);
    }
  });
};

export const calculateStagesFor = (length: number) => {
  if (length > 100) {
    return [3, 10, 30, 100];
  }

  return [5, 15, 50, 200];
};
