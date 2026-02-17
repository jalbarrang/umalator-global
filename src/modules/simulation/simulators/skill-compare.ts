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
  SkillEffectLog,
  SkillSimulationData,
  SkillSimulationRun,
  SkillTrackedMeta,
  SkillTrackedMetaCollection,
} from '@/modules/simulation/compare.types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CreateRunner, Runner as SundayRunner } from '@/lib/sunday-tools/common/runner';
import type {
  DuelingRates,
  SimulationSettings,
  RaceParameters as SundayRaceParameters,
} from '@/lib/sunday-tools/common/race';
import type { CourseData, IGroundCondition } from '@/lib/sunday-tools/course/definitions';
import type { ISkillTarget, ISkillType } from '@/lib/sunday-tools/skills/definitions';
import { initializeSkillSimulationRun } from '@/modules/simulation/compare.types';
import { Race } from '@/lib/sunday-tools/common/race';
import { PosKeepMode } from '@/lib/sunday-tools/runner/definitions';
import { parseAptitudeName, parseStrategyName } from '@/lib/sunday-tools/runner/runner.types';
import { SkillTarget, SkillType } from '@/lib/sunday-tools/skills/definitions';
import { getSkillMetaById } from '@/modules/skills/utils';

import skillsDataList from '@/modules/data/skill_data.json';

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

  // Parse strategy and aptitude from strings to numeric enums if needed
  const strategy = parseStrategyName(horse.strategy);
  const distanceAptitude = parseAptitudeName(horse.distanceAptitude);

  const baseSpeed = 20.0 - (course.distance - 2000) / 1000.0;
  const maxHp = 0.8 * HpStrategyCoefficient[strategy] * horse.stamina + course.distance;
  const groundModifier = HpConsumptionGroundModifier[course.surface][ground];
  const gutsModifier = 1.0 + 200.0 / Math.sqrt(600.0 * horse.guts);

  // Calculate base target speed for phase 2
  const baseTargetSpeed2 =
    baseSpeed * StrategyPhaseCoefficient[strategy][2] +
    Math.sqrt(500.0 * horse.speed) * DistanceProficiencyModifier[distanceAptitude] * 0.002;

  // Calculate max spurt speed
  const maxSpurtSpeed =
    (baseSpeed * (StrategyPhaseCoefficient[strategy][2] + 0.01) +
      Math.sqrt(horse.speed / 500.0) * DistanceProficiencyModifier[distanceAptitude]) *
      1.05 +
    Math.sqrt(500.0 * horse.speed) * DistanceProficiencyModifier[distanceAptitude] * 0.002 +
    Math.pow(450.0 * horse.guts, 0.597) * 0.0001;

  // Calculate HP consumption for the entire race
  // Phase 0: 0 to 1/6 of course (acceleration phase)
  const phase0Distance = course.distance / 6;
  const phase0Speed = baseSpeed * StrategyPhaseCoefficient[strategy][0];
  const phase0HpPerSec =
    ((20.0 * Math.pow(phase0Speed - baseSpeed + 12.0, 2)) / 144.0) * groundModifier;
  const phase0Time = phase0Distance / phase0Speed;
  const phase0Hp = phase0HpPerSec * phase0Time;

  // Phase 1: 1/6 to 2/3 of course (middle phase)
  const phase1Distance = (course.distance * 2) / 3 - phase0Distance;
  const phase1Speed = baseSpeed * StrategyPhaseCoefficient[strategy][1];
  const phase1HpPerSec =
    ((20.0 * Math.pow(phase1Speed - baseSpeed + 12.0, 2)) / 144.0) * groundModifier;
  const phase1Time = phase1Distance / phase1Speed;
  const phase1Hp = phase1HpPerSec * phase1Time;

  // Phase 2: 2/3 to finish (spurt phase)
  const spurtEntryPos = (course.distance * 2) / 3;
  const remainingDistance = course.distance - spurtEntryPos;
  const spurtDistance = remainingDistance - 60; // 60m buffer

  // HP consumption during spurt at max speed
  const spurtHpPerSec =
    ((20.0 * Math.pow(maxSpurtSpeed - baseSpeed + 12.0, 2)) / 144.0) *
    groundModifier *
    gutsModifier;
  const spurtTime = spurtDistance / maxSpurtSpeed;
  const spurtHp = spurtHpPerSec * spurtTime;

  // Total HP needed for the entire race with max spurt
  const totalHpNeeded = phase0Hp + phase1Hp + spurtHp;

  // HP remaining after race (can be negative if horse runs out)
  const hpRemaining = maxHp - totalHpNeeded;

  // Can max spurt if we have enough HP
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

type SkillDataEntry = {
  alternatives?: Array<{
    effects?: Array<{
      type: number;
      target?: number;
    }>;
  }>;
};

const STEP_SECONDS = 1 / 15;

const DEFAULT_DUELING_RATES: DuelingRates = {
  runaway: 10,
  frontRunner: 10,
  paceChaser: 10,
  lateSurger: 10,
  endCloser: 10,
};

function normalizeSkillId(skillId: string): string {
  return skillId.split('-')[0] ?? skillId;
}

function isSameSkill(skillIdA: string, skillIdB: string): boolean {
  return skillIdA === skillIdB || normalizeSkillId(skillIdA) === normalizeSkillId(skillIdB);
}

function createSkillSorterByGroup(allSkills: Array<string>) {
  const commonSkills = Array.from(new Set(allSkills.toSorted((a, b) => +a - +b)));

  const getCommonGroupIndex = (id: string) => {
    try {
      const baseId = normalizeSkillId(id);
      const groupId = getSkillMetaById(baseId).groupId;
      const index = commonSkills.findIndex((skillId) => {
        const commonBaseId = normalizeSkillId(skillId);
        return getSkillMetaById(commonBaseId).groupId === groupId;
      });
      return index > -1 ? index : commonSkills.length;
    } catch {
      return commonSkills.length;
    }
  };

  return (a: string, b: string) => {
    const groupIndexA = getCommonGroupIndex(a);
    const groupIndexB = getCommonGroupIndex(b);
    if (groupIndexA !== groupIndexB) {
      return groupIndexA - groupIndexB;
    }
    return +normalizeSkillId(a) - +normalizeSkillId(b);
  };
}

function toCreateRunner(runner: RunnerState, sortedSkills: Array<string>): CreateRunner {
  return {
    outfitId: runner.outfitId,
    mood: runner.mood,
    strategy: parseStrategyName(runner.strategy),
    aptitudes: {
      distance: parseAptitudeName(runner.distanceAptitude),
      surface: parseAptitudeName(runner.surfaceAptitude),
      strategy: parseAptitudeName(runner.strategyAptitude),
    },
    stats: {
      speed: runner.speed,
      stamina: runner.stamina,
      power: runner.power,
      guts: runner.guts,
      wit: runner.wisdom,
    },
    skills: sortedSkills,
  };
}

function toSundayRaceParameters(racedef: RunComparisonParams['racedef']): SundayRaceParameters {
  const race = racedef as Record<string, unknown>;

  const ground = (race.ground ?? race.groundCondition) as SundayRaceParameters['ground'];
  const weather = race.weather as SundayRaceParameters['weather'];
  const season = race.season as SundayRaceParameters['season'];
  const timeOfDay = (race.timeOfDay ?? race.time) as SundayRaceParameters['timeOfDay'];
  const grade = race.grade as SundayRaceParameters['grade'];

  if (ground == null || weather == null || season == null || timeOfDay == null || grade == null) {
    throw new Error('Invalid race conditions for Sunday engine migration');
  }

  return {
    ground,
    weather,
    season,
    timeOfDay,
    grade,
  };
}

function createCompareSettings(posKeepMode: number): SimulationSettings {
  return {
    mode: 'compare',
    healthSystem: false,
    sectionModifier: false,
    rushed: false,
    downhill: false,
    spotStruggle: false,
    dueling: false,
    witChecks: false,
    positionKeepMode: posKeepMode as SimulationSettings['positionKeepMode'],
  };
}

function createInitializedRace(params: {
  course: CourseData;
  raceParameters: SundayRaceParameters;
  settings: SimulationSettings;
  duelingRates: DuelingRates;
  skillSamples: number;
  runner: CreateRunner;
}): { race: Race; runner: SundayRunner } {
  const race = new Race({
    course: params.course,
    parameters: params.raceParameters,
    settings: params.settings,
    skillSamples: params.skillSamples,
    duelingRates: params.duelingRates,
  });

  race.onInitialize();
  race.skillSamples = params.skillSamples;
  race.addRunner(params.runner);
  race.prepareRace().validateRaceSetup();

  const trackedRunner = Array.from(race.runners.values())[0];
  if (!trackedRunner) {
    throw new Error('Failed to initialize runner in race');
  }

  return { race, runner: trackedRunner };
}

function getFallbackEffectMeta(skillId: string): {
  effectType: ISkillType;
  effectTarget: ISkillTarget;
} {
  const baseSkillId = normalizeSkillId(skillId);
  const skillData = (skillsDataList as Record<string, SkillDataEntry | undefined>)[baseSkillId];
  const firstEffect = skillData?.alternatives?.[0]?.effects?.[0];

  return {
    effectType: (firstEffect?.type ?? SkillType.Noop) as ISkillType,
    effectTarget: (firstEffect?.target ?? SkillTarget.Self) as ISkillTarget,
  };
}

type ActiveTrackedEffect = {
  key: string;
  effectType: ISkillType;
  effectTarget: ISkillTarget;
};

function collectTrackedActiveEffects(
  runner: SundayRunner,
  trackedSkillId: string,
): Array<ActiveTrackedEffect> {
  const activeEffects: Array<ActiveTrackedEffect> = [];
  const effectBuckets = [
    runner.targetSpeedSkillsActive,
    runner.currentSpeedSkillsActive,
    runner.accelerationSkillsActive,
    runner.laneMovementSkillsActive,
    runner.changeLaneSkillsActive,
  ];

  for (const bucket of effectBuckets) {
    for (const effect of bucket) {
      if (!isSameSkill(effect.skillId, trackedSkillId)) {
        continue;
      }

      activeEffects.push({
        key: `${effect.effectType}:${effect.effectTarget}:${effect.modifier.toFixed(6)}`,
        effectType: effect.effectType,
        effectTarget: effect.effectTarget,
      });
    }
  }

  return activeEffects;
}

export function runSkillComparison(params: SkillCompareParams): SkillComparisonResult {
  const { nsamples, course, racedef, runnerA, runnerB, trackedSkillId, options } = params;

  const seed = options.seed ?? 0;
  const posKeepMode = options.posKeepMode ?? PosKeepMode.None;
  const skillSorter = createSkillSorterByGroup([...runnerA.skills, ...runnerB.skills]);
  const runnerASortedSkills = runnerA.skills.toSorted(skillSorter);
  const runnerBSortedSkills = runnerB.skills.toSorted(skillSorter);

  const raceParameters = toSundayRaceParameters(racedef);
  const settings = createCompareSettings(posKeepMode);

  const { race: raceA, runner: runnerAEntity } = createInitializedRace({
    course,
    raceParameters,
    settings,
    duelingRates: DEFAULT_DUELING_RATES,
    skillSamples: nsamples,
    runner: toCreateRunner(runnerA, runnerASortedSkills),
  });

  const { race: raceB, runner: runnerBEntity } = createInitializedRace({
    course,
    raceParameters,
    settings,
    duelingRates: DEFAULT_DUELING_RATES,
    skillSamples: nsamples,
    runner: toCreateRunner(runnerB, runnerBSortedSkills),
  });

  const fallbackEffectMeta = getFallbackEffectMeta(trackedSkillId);
  const runnerBSkillActivations = new Map<string, SkillTrackedMetaCollection>();

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

  // ===============================================
  // Sample Loop
  // ===============================================

  for (let i = 0; i < nsamples; ++i) {
    const sampleSeed = seed + i;
    raceA.prepareRound(sampleSeed);
    raceB.prepareRound(sampleSeed);

    raceA.accumulatedTime = 0;
    raceB.accumulatedTime = 0;
    raceA.finishedRunners = [];
    raceB.finishedRunners = [];

    const data: SkillSimulationRun = initializeSkillSimulationRun();
    const trackedMeta: SkillTrackedMeta = {
      horseLength: 0,
      positions: [],
    };
    const trackedEffectLogs: Array<SkillEffectLog> = [];
    const openEffectsByKey = new Map<string, Array<number>>();
    let trackedSkillUsed = false;
    let effectSequence = 0;

    const appendActivationPosition = (position: number) => {
      const clampedPosition = Math.min(position, course.distance);
      const lastPosition = trackedMeta.positions[trackedMeta.positions.length - 1];
      if (lastPosition == null || Math.abs(lastPosition - clampedPosition) > 1e-9) {
        trackedMeta.positions.push(clampedPosition);
      }
    };

    const closeOpenEffects = (position: number) => {
      const clampedPosition = Math.min(position, course.distance);
      for (const indices of openEffectsByKey.values()) {
        while (indices.length > 0) {
          const logIndex = indices.pop();
          if (logIndex != null) {
            trackedEffectLogs[logIndex].end = clampedPosition;
          }
        }
      }
      openEffectsByKey.clear();
    };

    const reconcileActiveEffects = () => {
      if (
        runnerBEntity.usedSkills.has(trackedSkillId) ||
        runnerBEntity.usedSkills.has(normalizeSkillId(trackedSkillId))
      ) {
        trackedSkillUsed = true;
      } else {
        for (const usedSkillId of runnerBEntity.usedSkills) {
          if (isSameSkill(usedSkillId, trackedSkillId)) {
            trackedSkillUsed = true;
            break;
          }
        }
      }

      const currentPosition = Math.min(runnerBEntity.position, course.distance);
      const trackedEffects = collectTrackedActiveEffects(runnerBEntity, trackedSkillId);
      const currentCounts = new Map<
        string,
        { count: number; effectType: ISkillType; effectTarget: ISkillTarget }
      >();

      for (const effect of trackedEffects) {
        const current = currentCounts.get(effect.key);
        if (current) {
          current.count++;
        } else {
          currentCounts.set(effect.key, {
            count: 1,
            effectType: effect.effectType,
            effectTarget: effect.effectTarget,
          });
        }
      }

      for (const [key, current] of currentCounts.entries()) {
        const openIndices = openEffectsByKey.get(key) ?? [];
        while (openIndices.length < current.count) {
          appendActivationPosition(currentPosition);

          trackedEffectLogs.push({
            executionId: `${sampleSeed}-${effectSequence++}`,
            skillId: trackedSkillId,
            start: currentPosition,
            end: currentPosition,
            perspective: 1,
            effectType: current.effectType,
            effectTarget: current.effectTarget,
          });

          openIndices.push(trackedEffectLogs.length - 1);
        }
        openEffectsByKey.set(key, openIndices);
      }

      for (const [key, openIndices] of openEffectsByKey.entries()) {
        const expectedCount = currentCounts.get(key)?.count ?? 0;
        while (openIndices.length > expectedCount) {
          const logIndex = openIndices.pop();
          if (logIndex != null) {
            trackedEffectLogs[logIndex].end = currentPosition;
          }
        }
        if (openIndices.length === 0) {
          openEffectsByKey.delete(key);
        }
      }
    };

    let raceAFinished = false;
    let raceBFinished = false;
    let positionDiff = 0;

    while (!raceAFinished || !raceBFinished) {
      if (!raceBFinished) {
        raceB.onUpdate(STEP_SECONDS);
        reconcileActiveEffects();

        if (runnerBEntity.finished) {
          raceBFinished = true;
          closeOpenEffects(runnerBEntity.position);

          if (!raceAFinished) {
            positionDiff = runnerBEntity.position - runnerAEntity.position;
          }
        }
      }

      if (!raceAFinished) {
        raceA.onUpdate(STEP_SECONDS);

        if (runnerAEntity.finished) {
          raceAFinished = true;

          if (!raceBFinished) {
            positionDiff = runnerAEntity.position - runnerBEntity.position;
          }
        }
      }
    }

    closeOpenEffects(course.distance);

    if (trackedEffectLogs.length === 0 && trackedSkillUsed) {
      const activationPosition = Math.min(runnerBEntity.position, course.distance);
      appendActivationPosition(activationPosition);
      trackedEffectLogs.push({
        executionId: `${sampleSeed}-fallback`,
        skillId: trackedSkillId,
        start: activationPosition,
        end: activationPosition,
        perspective: 1,
        effectType: fallbackEffectMeta.effectType,
        effectTarget: fallbackEffectMeta.effectTarget,
      });
    }

    if (trackedEffectLogs.length > 0) {
      data.sk[1][trackedSkillId] = trackedEffectLogs;
    }

    const basinn = (sign * positionDiff) / 2.5;
    trackedMeta.horseLength = basinn;
    if (trackedSkillUsed || trackedMeta.positions.length > 0) {
      const collection = runnerBSkillActivations.get(trackedSkillId) ?? [];
      collection.push(trackedMeta);
      runnerBSkillActivations.set(trackedSkillId, collection);
    }

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

  // ===============================================
  // Calculate Statistics
  // ===============================================

  diff.sort((a, b) => a - b);

  const mid = Math.floor(diff.length / 2);
  const median = diff.length % 2 == 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
  const mean = diff.reduce((a, b) => a + b) / diff.length;

  return {
    results: diff,
    skillActivations: Object.fromEntries(runnerBSkillActivations),
    runData: { minrun, maxrun, meanrun, medianrun },

    min: diff[0],
    max: diff[diff.length - 1],
    mean,
    median,
  };
}

export const runSampling = (params: Run1RoundParams): SkillComparisonResponse => {
  const { nsamples, skills, course, racedef, uma, pacer, options } = params;

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
      pacer,
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
