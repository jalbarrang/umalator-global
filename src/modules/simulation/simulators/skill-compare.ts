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
  TheoreticalMaxSpurtResult,
} from '@/modules/simulation/types';
import type {
  SkillSimulationData,
  SkillSimulationRun,
  SkillTrackedMetaCollection,
} from '@/modules/simulation/compare.types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData, IGroundCondition } from '@/lib/sunday-tools/course/definitions';
import { initializeSkillSimulationRun } from '@/modules/simulation/compare.types';
import {
  SkillCompareDataCollector,
  VacuumCompareDataCollector,
} from '@/lib/sunday-tools/common/race-observer';
import { parseAptitudeName, parseStrategyName } from '@/lib/sunday-tools/runner/runner.types';
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

export function calculateTheoreticalMaxSpurt(
  horse: RunnerState,
  course: CourseData,
  ground: IGroundCondition,
): TheoreticalMaxSpurtResult {
  const HpStrategyCoefficient = [0, 0.95, 0.89, 1.0, 0.995, 0.86];
  const HpConsumptionGroundModifier = [[], [0, 1.0, 1.0, 1.02, 1.02], [0, 1.0, 1.0, 1.01, 1.02]];
  const StrategyPhaseCoefficient = [
    [],
    [1.0, 0.98, 0.962],
    [0.978, 0.991, 0.975],
    [0.938, 0.998, 0.994],
    [0.931, 1.0, 1.0],
    [1.063, 0.962, 0.95],
  ];
  const DistanceProficiencyModifier = [1.05, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1];

  const strategy = parseStrategyName(horse.strategy);
  const distanceAptitude = parseAptitudeName(horse.distanceAptitude);

  const baseSpeed = 20.0 - (course.distance - 2000) / 1000.0;
  const maxHp = 0.8 * HpStrategyCoefficient[strategy] * horse.stamina + course.distance;
  const groundModifier = HpConsumptionGroundModifier[course.surface][ground];
  const gutsModifier = 1.0 + 200.0 / Math.sqrt(600.0 * horse.guts);

  const baseTargetSpeed2 =
    baseSpeed * StrategyPhaseCoefficient[strategy][2] +
    Math.sqrt(500.0 * horse.speed) * DistanceProficiencyModifier[distanceAptitude] * 0.002;

  const maxSpurtSpeed =
    (baseSpeed * (StrategyPhaseCoefficient[strategy][2] + 0.01) +
      Math.sqrt(horse.speed / 500.0) * DistanceProficiencyModifier[distanceAptitude]) *
      1.05 +
    Math.sqrt(500.0 * horse.speed) * DistanceProficiencyModifier[distanceAptitude] * 0.002 +
    Math.pow(450.0 * horse.guts, 0.597) * 0.0001;

  const phase0Distance = course.distance / 6;
  const phase0Speed = baseSpeed * StrategyPhaseCoefficient[strategy][0];
  const phase0HpPerSec =
    ((20.0 * Math.pow(phase0Speed - baseSpeed + 12.0, 2)) / 144.0) * groundModifier;
  const phase0Time = phase0Distance / phase0Speed;
  const phase0Hp = phase0HpPerSec * phase0Time;

  const phase1Distance = (course.distance * 2) / 3 - phase0Distance;
  const phase1Speed = baseSpeed * StrategyPhaseCoefficient[strategy][1];
  const phase1HpPerSec =
    ((20.0 * Math.pow(phase1Speed - baseSpeed + 12.0, 2)) / 144.0) * groundModifier;
  const phase1Time = phase1Distance / phase1Speed;
  const phase1Hp = phase1HpPerSec * phase1Time;

  const spurtEntryPos = (course.distance * 2) / 3;
  const remainingDistance = course.distance - spurtEntryPos;
  const spurtDistance = remainingDistance - 60;

  const spurtHpPerSec =
    ((20.0 * Math.pow(maxSpurtSpeed - baseSpeed + 12.0, 2)) / 144.0) *
    groundModifier *
    gutsModifier;
  const spurtTime = spurtDistance / maxSpurtSpeed;
  const spurtHp = spurtHpPerSec * spurtTime;

  const totalHpNeeded = phase0Hp + phase1Hp + spurtHp;
  const hpRemaining = maxHp - totalHpNeeded;
  const canMaxSpurt = hpRemaining >= 0;

  return {
    canMaxSpurt,
    maxHp,
    hpNeededForMaxSpurt: totalHpNeeded,
    maxSpurtSpeed,
    baseTargetSpeed2,
    hpRemaining,
  };
}

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
  const collectorA = new VacuumCompareDataCollector();
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

    const roundA = collectorA.getPrimaryRunnerRoundData();
    const roundB = collectorB.getPrimaryRunnerRoundData();

    if (!roundA || !roundB) {
      throw new Error('Missing collected runner data for skill comparison');
    }

    const positionDiff = computePositionDiff(roundA.position, roundB.position);
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

    if (i == sampleCutoff) {
      diff.sort((a, b) => a - b);

      estMean = diff.reduce((a, b) => a + b) / diff.length;

      const mid = Math.floor(diff.length / 2);
      estMedian = mid > 0 && diff.length % 2 == 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
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
  const median = diff.length % 2 == 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
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
