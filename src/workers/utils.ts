import { SimulationData } from '@/modules/simulation/compare.types';
import { RoundResult, SkillBasinResponse } from '@/modules/simulation/types';
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

  let mergedRunData: SimulationData;

  if (resultA.runData && resultB.runData) {
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
    mergedRunData = resultB.runData;
  } else if (resultA.runData) {
    mergedRunData = resultA.runData;
  } else {
    mergedRunData = undefined;
  }

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
  resultSetB.forEach((resultB, id) => {
    if (resultSetA.has(id)) {
      resultSetA.set(id, mergeResults(resultSetA.get(id), resultB));
    }
  });
};

export const calculateStagesFor = (length: number) => {
  if (length > 100) {
    return [3, 10, 30, 100];
  }

  return [5, 15, 50, 200];
};
