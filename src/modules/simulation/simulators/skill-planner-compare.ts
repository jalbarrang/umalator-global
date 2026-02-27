import type { RunComparisonParams } from '@/modules/simulation/types';
import type { SkillTrackedMetaCollection } from '@/modules/simulation/compare.types';
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

export type PlannerCompareParams = RunComparisonParams & {
  candidateSkills: Array<string>;
};

export type PlannerCompareResult = {
  results: Array<number>;
  skillActivations: Record<string, SkillTrackedMetaCollection>;
  min: number;
  max: number;
  mean: number;
  median: number;
};

export function runPlannerComparison(params: PlannerCompareParams): PlannerCompareResult {
  const { nsamples, course, racedef, runnerA, runnerB, candidateSkills, options } = params;

  const seed = options.seed ?? 0;
  const skillSorter = createSkillSorterByGroup([...runnerA.skills, ...runnerB.skills]);
  const runnerASortedSkills = runnerA.skills.toSorted(skillSorter);
  const runnerBSortedSkills = runnerB.skills.toSorted(skillSorter);

  const raceParameters = toSundayRaceParameters(racedef);
  const settings = createCompareSettings();

  const trackedSkillId = candidateSkills[0] ?? runnerB.skills[0] ?? runnerA.skills[0] ?? '0';
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

  const diff: Array<number> = [];
  let estMean = 0;
  let estMedian = 0;
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
      throw new Error('Missing collected runner data for planner comparison');
    }

    const positionDiff = computePositionDiff(baselinePosition, roundB.position);
    const basinn = positionDiff / 2.5;
    collectorB.finalizeCurrentTrackedMeta(basinn);
    diff.push(basinn);

    if (i === sampleCutoff) {
      diff.sort((a, b) => a - b);
      estMean = diff.reduce((sum, value) => sum + value, 0) / diff.length;
      const mid = Math.floor(diff.length / 2);
      estMedian = mid > 0 && diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
    }
  }

  diff.sort((a, b) => a - b);
  const mid = Math.floor(diff.length / 2);
  const median = diff.length % 2 === 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
  const mean = diff.reduce((sum, value) => sum + value, 0) / diff.length;

  const trackedMetaCollection = collectorB.getTrackedMetaCollection();
  const skillActivations =
    trackedMetaCollection.length > 0 ? { [trackedSkillId]: trackedMetaCollection } : {};

  return {
    results: diff,
    skillActivations,
    min: diff[0] ?? 0,
    max: diff[diff.length - 1] ?? 0,
    mean: diff.length > 0 ? mean : estMean,
    median: diff.length > 0 ? median : estMedian,
  };
}
