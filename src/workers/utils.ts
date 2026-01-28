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

  // const allruns1 = resultA.runData?.allruns ?? {};
  // const allruns2 = resultB.runData?.allruns ?? {};
  // const { skBasinn: skBasinn1, sk: sk1, totalRuns: totalRuns1, ...rest1 } = allruns1;
  // const { skBasinn: skBasinn2, sk: sk2, totalRuns: totalRuns2, ...rest2 } = allruns2;

  // const mergedAllRuns: any = {
  //   ...rest1,
  //   ...rest2,
  //   totalRuns: (totalRuns1 || 0) + (totalRuns2 || 0),
  // };

  // if (skBasinn1 && skBasinn2) {
  //   mergedAllRuns.skBasinn = [
  //     mergeSkillMaps(skBasinn1[0] || {}, skBasinn2[0] || {}),
  //     mergeSkillMaps(skBasinn1[1] || {}, skBasinn2[1] || {}),
  //   ];
  // } else if (skBasinn1 || skBasinn2) {
  //   mergedAllRuns.skBasinn = skBasinn1 || skBasinn2;
  // }

  // if (sk1 && sk2) {
  //   mergedAllRuns.sk = [
  //     mergeSkillMaps(sk1[0] || {}, sk2[0] || {}),
  //     mergeSkillMaps(sk1[1] || {}, sk2[1] || {}),
  //   ];
  // } else if (sk1 || sk2) {
  //   mergedAllRuns.sk = sk1 || sk2;
  // }

  return {
    id: resultA.id,
    results: combinedResults,
    min: Math.min(resultA.min, resultB.min),
    max: Math.max(resultA.max, resultB.max),
    mean: combinedMean,
    median: newMedian,
    runData: {
      ...(countB > countA ? resultB.runData : resultA.runData),
      // allruns: mergedAllRuns,
      minrun: resultA.min < resultB.min ? resultA.runData.minrun : resultB.runData.minrun,
      maxrun: resultA.max > resultB.max ? resultA.runData.maxrun : resultB.runData.maxrun,
    },
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

  const combinedResults = [...resultA.results, ...resultB.results].toSorted((a, b) => a - b);

  const combinedMean =
    (resultA.mean * resultSizeA + resultB.mean * resultSizeB) / (resultSizeA + resultSizeB);

  const mid = Math.floor(combinedResults.length / 2);

  const newMedian =
    combinedResults.length % 2 == 0
      ? (combinedResults[mid - 1] + combinedResults[mid]) / 2
      : combinedResults[mid];

  const mergedRunData: SkillSimulationData = {
    ...(resultSizeB > resultSizeA ? resultB.runData : resultA.runData),
    minrun: resultA.min < resultB.min ? resultA.runData.minrun : resultB.runData.minrun,
    maxrun: resultA.max > resultB.max ? resultA.runData.maxrun : resultB.runData.maxrun,
  };

  return {
    id: resultA.id,
    results: combinedResults,
    min: Math.min(resultA.min, resultB.min),
    max: Math.max(resultA.max, resultB.max),
    mean: combinedMean,
    median: newMedian,
    runData: mergedRunData,
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
