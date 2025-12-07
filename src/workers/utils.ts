import { RoundResult } from '@/modules/simulation/types';
import assert from 'assert';

export const mergeResults = (resultA: RoundResult, resultB: RoundResult) => {
  assert(
    resultA.id == resultB.id,
    `mergeResults: ${resultA.id} != ${resultB.id}`,
  );

  const n1 = resultA.results.length;
  const n2 = resultB.results.length;

  const combinedResults = resultA.results
    .concat(resultB.results)
    .sort((a, b) => a - b);

  const combinedMean = (resultA.mean * n1 + resultB.mean * n2) / (n1 + n2);
  const mid = Math.floor(combinedResults.length / 2);
  const newMedian =
    combinedResults.length % 2 == 0
      ? (combinedResults[mid - 1] + combinedResults[mid]) / 2
      : combinedResults[mid];

  return {
    id: resultA.id,
    results: combinedResults,
    min: Math.min(resultA.min, resultB.min),
    max: Math.max(resultA.max, resultB.max),
    mean: combinedMean,
    median: newMedian,
    runData: {
      // TODO should re-compute the bashin gain from .t/.p and pick whichever is closer to new mean/median
      ...(n2 > n1 ? resultB.runData : resultA.runData),
      minrun:
        resultA.min < resultB.min
          ? resultA.runData.minrun
          : resultB.runData.minrun,
      maxrun:
        resultA.max > resultB.max
          ? resultA.runData.maxrun
          : resultB.runData.maxrun,
    },
  };
};

export const mergeResultSets = (
  resultSetA: Map<string, RoundResult>,
  resultSetB: Map<string, RoundResult>,
) => {
  resultSetB.forEach((resultB: RoundResult, id: string) => {
    if (resultSetA.has(id)) {
      resultSetA.set(id, mergeResults(resultSetA.get(id), resultB));
    }
  });
};
