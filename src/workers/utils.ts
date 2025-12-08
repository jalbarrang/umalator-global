import { RoundResult, SkillBasinResponse } from '@/modules/simulation/types';
import { SimulationData } from '@/store/race/compare.types';
import assert from 'assert';

export const mergeResults = (resultA: RoundResult, resultB: RoundResult) => {
  assert(
    resultA.id == resultB.id,
    `mergeResults: ${resultA.id} != ${resultB.id}`,
  );

  const resultSizeA = resultA.results.length;
  const resultSizeB = resultB.results.length;

  const combinedResults = resultA.results
    .concat(resultB.results)
    .sort((a, b) => a - b);

  const combinedMean =
    (resultA.mean * resultSizeA + resultB.mean * resultSizeB) /
    (resultSizeA + resultSizeB);

  const mid = Math.floor(combinedResults.length / 2);

  const newMedian =
    combinedResults.length % 2 == 0
      ? (combinedResults[mid - 1] + combinedResults[mid]) / 2
      : combinedResults[mid];

  // Smart runData merging: use whichever exists, or merge if both exist
  let mergedRunData: SimulationData;

  if (resultA.runData && resultB.runData) {
    // Both have runData - merge them
    mergedRunData = {
      // TODO should re-compute the bashin gain from .t/.p and pick whichever is closer to new mean/median
      ...(resultSizeB > resultSizeA ? resultB.runData : resultA.runData),
      minrun:
        resultA.min < resultB.min
          ? resultA.runData.minrun
          : resultB.runData.minrun,
      maxrun:
        resultA.max > resultB.max
          ? resultA.runData.maxrun
          : resultB.runData.maxrun,
    };
  } else if (resultB.runData) {
    // Only B has runData (most common case in stage 4)
    mergedRunData = resultB.runData;
  } else if (resultA.runData) {
    // Only A has runData (rare, but possible)
    mergedRunData = resultA.runData;
  }
  // else: neither has runData, mergedRunData stays undefined

  return {
    id: resultA.id,
    results: combinedResults,
    min: Math.min(resultA.min, resultB.min),
    max: Math.max(resultA.max, resultB.max),
    mean: combinedMean,
    median: newMedian,
    runData: mergedRunData,
  };
};

export const mergeResultSets = (
  resultSetA: SkillBasinResponse,
  resultSetB: SkillBasinResponse,
) => {
  Object.entries(resultSetB).forEach(([id, resultB]) => {
    if (resultSetA[id]) {
      resultSetA[id] = mergeResults(resultSetA[id], resultB);
    }
  });
};

export const calculateStagesFor = (length: number) => {
  if (length > 100) {
    return [3, 10, 30, 100];
  }

  return [5, 15, 50, 200];
};
