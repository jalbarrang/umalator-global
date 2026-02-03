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

import type {
  ActiveSkill,
  OnSkillCallback,
  RaceSolver,
} from '@/modules/simulation/lib/core/RaceSolver';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData, IGroundCondition } from '@/modules/simulation/lib/course/definitions';
import type {
  ISkillPerspective,
  ISkillTarget,
  ISkillType,
} from '@/modules/simulation/lib/skills/definitions';
import { initializeSkillSimulationRun } from '@/modules/simulation/compare.types';
import {
  RaceSolverBuilder,
  buildAdjustedStats,
  buildBaseStats,
  parseAptitude,
  parseStrategy,
} from '@/modules/simulation/lib/core/RaceSolverBuilder';
import { PosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import {
  SkillPerspective,
  SkillTarget,
  SkillType,
} from '@/modules/simulation/lib/skills/definitions';
import { getSkillMetaById } from '@/modules/skills/utils';

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
  const strategy = parseStrategy(horse.strategy);
  const distanceAptitude = parseAptitude(horse.distanceAptitude, 'distance');

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

export function runSkillComparison(params: SkillCompareParams): SkillComparisonResult {
  const { nsamples, course, racedef, runnerA, runnerB, trackedSkillId, options } = params;

  const seed = options.seed ?? 0;
  const posKeepMode = options.posKeepMode ?? PosKeepMode.None;
  const mode = options.mode ?? 'compare';
  const numUmas = racedef.numUmas ?? 1;

  const runnerARaceSolver = new RaceSolverBuilder(nsamples)
    .seed(seed)
    .course(course)
    .ground(racedef.groundCondition)
    .weather(racedef.weather)
    .season(racedef.season)
    .time(racedef.time)
    .useHpPolicy(false)
    .accuracyMode(options.accuracyMode ?? false)
    .posKeepMode(posKeepMode)
    .mode(mode);

  if (racedef.orderRange) {
    const [start, end] = racedef.orderRange;
    runnerARaceSolver.order(start, end).numUmas(numUmas);
  }

  // Fork to share RNG - both horses face the same random events for fair comparison
  const runnerBRaceSolver = runnerARaceSolver.fork();

  if (options.mode === 'compare') {
    runnerARaceSolver.desync();
  }

  runnerARaceSolver.horse(runnerA);
  runnerBRaceSolver.horse(runnerB);

  // Apply rushed toggles
  runnerARaceSolver.disableRushed();
  runnerBRaceSolver.disableRushed();

  // Apply downhill toggles
  runnerARaceSolver.disableDownhill();
  runnerBRaceSolver.disableDownhill();

  runnerARaceSolver.disableSectionModifier();
  runnerBRaceSolver.disableSectionModifier();

  // Apply skill check chance toggle
  runnerARaceSolver.skillCheckChance(false);
  runnerBRaceSolver.skillCheckChance(false);

  // ensure skills common to the two umas are added in the same order regardless of what additional skills they have
  // this is important to make sure the rng for their activations is synced
  // sort first by groupId so that white and gold versions of a skill get added in the same order

  const commonSkillsArray = [...runnerA.skills, ...runnerB.skills].toSorted((a, b) => +a - +b);
  const commonSkills = Array.from(new Set(commonSkillsArray));

  // Get groupIds for common skills
  const getCommonGroupIndex = (id: string) => {
    try {
      const baseId = id.split('-')[0];
      const groupId = getSkillMetaById(baseId).groupId;
      const index = commonSkills.findIndex((skillId) => {
        const commonBaseId = skillId.split('-')[0];
        return getSkillMetaById(commonBaseId).groupId === groupId;
      });
      return index > -1 ? index : commonSkills.length;
    } catch {
      // If skill meta not found, sort to end
      return commonSkills.length;
    }
  };

  // Sort by groupId first (for white/gold versions), then by skill ID
  const skillSorterByGroup = (a: string, b: string) => {
    const groupIndexA = getCommonGroupIndex(a);
    const groupIndexB = getCommonGroupIndex(b);
    if (groupIndexA !== groupIndexB) {
      return groupIndexA - groupIndexB;
    }
    // If same group, sort by skill ID
    return +a.split('-')[0] - +b.split('-')[0];
  };

  const runnerABaseStats = buildBaseStats({ ...runnerA });
  const runnerAAdjustedStats = buildAdjustedStats(
    runnerABaseStats,
    course,
    racedef.groundCondition,
  );
  const runnerAWit = runnerAAdjustedStats.wisdom;

  const runnerBBaseStats = buildBaseStats({ ...runnerB });
  const runnerBAdjustedStats = buildAdjustedStats(
    runnerBBaseStats,
    course,
    racedef.groundCondition,
  );

  const runnerBWit = runnerBAdjustedStats.wisdom;

  const runnerASortedSkills = runnerA.skills.toSorted(skillSorterByGroup);

  for (const id of runnerASortedSkills) {
    const skillId = id.split('-')[0];
    const forcedPos = runnerA.forcedSkillPositions[id];

    if (forcedPos) {
      runnerARaceSolver.addSkillAtPosition(skillId, forcedPos, SkillPerspective.Self);
      runnerBRaceSolver.addSkill(skillId, SkillPerspective.Other, undefined, runnerAWit);
    } else {
      runnerARaceSolver.addSkill(skillId, SkillPerspective.Self);
      runnerBRaceSolver.addSkill(skillId, SkillPerspective.Other, undefined, runnerAWit);
    }
  }

  const runnerBSortedSkills = runnerB.skills.toSorted(skillSorterByGroup);

  for (const id of runnerBSortedSkills) {
    const skillId = id.split('-')[0];
    const forcedPos = runnerB.forcedSkillPositions[id];

    if (forcedPos != null) {
      runnerBRaceSolver.addSkillAtPosition(skillId, forcedPos, SkillPerspective.Self);
      runnerARaceSolver.addSkill(skillId, SkillPerspective.Other, undefined, runnerBWit);
    } else {
      runnerBRaceSolver.addSkill(skillId, SkillPerspective.Self);
      runnerARaceSolver.addSkill(skillId, SkillPerspective.Other, undefined, runnerBWit);
    }
  }

  // ===== Skill Activation Tracking =====

  const runnerBSkillActivations: Map<string, SkillTrackedMetaCollection> = new Map();
  const currentSampleMeta: Map<string, SkillTrackedMeta> = new Map();
  const runnerBEffectLogs: Map<string, Array<SkillEffectLog>> = new Map();

  const handleSkillActivation = (skillsSet: Map<string, SkillTrackedMeta>): OnSkillCallback => {
    return (context) => {
      const { currentPosition, skillId } = context;

      if (skillId !== trackedSkillId) {
        return;
      }

      const skillActivations = skillsSet.get(skillId) ?? {
        horseLength: 0,
        positions: [],
      };

      skillActivations.positions.push(currentPosition);
      skillsSet.set(skillId, skillActivations);
    };
  };

  const handleEffectActivated = (skillsSet: Map<string, Array<SkillEffectLog>>) => {
    return (
      _raceSolver: RaceSolver,
      currentPosition: number,
      executionId: string,
      skillId: string,
      perspective: ISkillPerspective,
      effectType: ISkillType,
      effectTarget: ISkillTarget,
    ) => {
      if (['asitame', 'staminasyoubu'].includes(skillId)) {
        return;
      }

      if (effectTarget === SkillTarget.Self) {
        const skillSetValue = skillsSet.get(skillId) ?? [];

        skillSetValue.push({
          executionId,
          skillId,
          start: currentPosition,
          end: currentPosition,
          perspective,
          effectType,
          effectTarget,
        });

        skillsSet.set(skillId, skillSetValue);
      }
    };
  };

  const handleEffectExpiration = (skillsSet: Map<string, Array<SkillEffectLog>>) => {
    return (
      _raceSolver: RaceSolver,
      currentPosition: number,
      _executionId: string,
      skillId: string,
      _perspective: ISkillPerspective,
      _effectType: ISkillType,
      _effectTarget: ISkillTarget,
    ) => {
      if (['asitame', 'staminasyoubu'].includes(skillId)) {
        return;
      }

      const skillActivations = skillsSet.get(skillId) ?? [];

      if (skillActivations && skillActivations.length > 0) {
        const firstActivation = skillActivations?.[0];

        for (let i = 0; i < skillActivations.length; i++) {
          if (skillActivations[i].effectType === SkillType.Recovery) continue;

          if (currentPosition > firstActivation.start) {
            skillActivations[i].end = Math.min(currentPosition, course.distance);
          }
        }

        skillsSet.set(skillId, skillActivations);
      }
    };
  };

  runnerBRaceSolver.onSkillActivated(handleSkillActivation(currentSampleMeta));
  runnerBRaceSolver.onEffectActivated(handleEffectActivated(runnerBEffectLogs));
  runnerBRaceSolver.onEffectExpired(handleEffectExpiration(runnerBEffectLogs));

  const a = runnerARaceSolver.build();
  const b = runnerBRaceSolver.build();

  const sign = 1;
  const diff = [];

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

  let retry = false;

  // ===============================================
  // Sample Loop
  // ===============================================

  for (let i = 0; i < nsamples; ++i) {
    const solverA = a.next(retry).value as RaceSolver;
    const solverB = b.next(retry).value as RaceSolver;

    const data: SkillSimulationRun = initializeSkillSimulationRun();

    // Solver A faces solver B
    solverA.initUmas([solverB]);
    // Solver B faces solver A
    solverB.initUmas([solverA]);

    let solverAFinished = false;
    let solverBFinished = false;
    // Difference in position between solver A and solver B
    let positionDiff = 0;

    while (!solverAFinished || !solverBFinished) {
      // Update solver B
      if (solverB.pos < course.distance) {
        // Step solver B for 1/15 seconds
        solverB.step(1 / 15);
      } else if (!solverBFinished) {
        // Solver B has finished the race
        solverBFinished = true;

        if (!solverAFinished) {
          positionDiff = solverB.pos - solverA.pos;
        }
      }

      // Update solver A
      if (solverA.pos < course.distance) {
        // Step solver A for 1/15 seconds
        solverA.step(1 / 15);
      } else if (!solverAFinished) {
        // Solver A has finished the race
        solverAFinished = true;

        if (!solverBFinished) {
          positionDiff = solverA.pos - solverB.pos;
        }
      }
    }

    // Clean up skills that are still active when the race ends
    // This ensures skills that activate near the finish line get proper end positions
    // Also handles skills with very short durations that might deactivate in the same frame
    const cleanupActiveSkills = (
      solver: RaceSolver,
      selfSkillSet: Map<string, Array<SkillEffectLog>>,
    ) => {
      const callDeactivator = (skill: ActiveSkill) => {
        // Call the deactivator to set the end position to course.distance
        // This handles both race-end cleanup and very short duration skills
        // Use the correct skill position maps for this solver
        const currentPosition = solver.pos;
        handleEffectExpiration(selfSkillSet)(
          solver,
          currentPosition,
          skill.executionId,
          skill.skillId,
          skill.perspective,
          skill.effectType,
          skill.effectTarget,
        );
      };

      solver.activeTargetSpeedSkills.forEach(callDeactivator);
      solver.activeCurrentSpeedSkills.forEach(callDeactivator);
      solver.activeAccelSkills.forEach(callDeactivator);
    };

    // Clean up active skills for both horses
    // s1 comes from generator 'a' (standard), s2 comes from generator 'b' (compare)
    // standard uses skillPos1 for self, skillPos2 for other, debuffsReceived1 for debuffs received
    // compare uses skillPos2 for self, skillPos1 for other, debuffsReceived2 for debuffs received
    cleanupActiveSkills(solverB, runnerBEffectLogs);

    data.sk[1] = Object.fromEntries(runnerBEffectLogs);

    // Clear the maps instead of reassigning to preserve closure references
    runnerBEffectLogs.clear();

    retry = false;

    // Cleanup AFTER stat tracking
    solverB.cleanup();
    solverA.cleanup();

    const basinn = (sign * positionDiff) / 2.5;

    currentSampleMeta.forEach((activation) => {
      activation.horseLength = basinn;
    });

    currentSampleMeta.forEach((meta, skillId) => {
      const collection = runnerBSkillActivations.get(skillId) ?? [];

      collection.push(meta); // Add this sample's data
      runnerBSkillActivations.set(skillId, collection);
    });

    currentSampleMeta.clear();

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
