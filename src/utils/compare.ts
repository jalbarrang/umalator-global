/**
 * # Runner Comparison for Sunday's Shadow
 *
 * ## Overview
 *
 * This module is used to compare the performance of two runners in a race by running
 * multiple samples of simulation using seeded runs for different aspects of the race.
 *
 * The goal of this Module is to provide a way a to compare how many Bashins is a Runner
 * able to achieve in a race compared to another.
 *
 * The Comparison works best when you have two runner of the same outfit but with different Skills or Statlines.
 *
 * ### Notes
 *
 * As this only compares two runners, it is not possible to simulate races with 9 runners as it would defeat the purpose of this compare tool.
 */

import { cloneDeep } from 'es-toolkit';
import type {
  Run1RoundParams,
  RunComparisonParams,
  SkillBasinResponse,
  TheoreticalMaxSpurtResult,
} from '@/modules/simulation/types';
import type {
  CompareResult,
  SimulationRun,
  SkillActivation,
} from '@/modules/simulation/compare.types';

import type { ActiveSkill, RaceSolver } from '@/modules/simulation/lib/core/RaceSolver';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData, IGroundCondition } from '@/modules/simulation/lib/course/definitions';
import type {
  ISkillPerspective,
  ISkillTarget,
  ISkillType,
} from '@/modules/simulation/lib/skills/definitions';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import { Rule30CARng } from '@/modules/simulation/lib/utils/Random';
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

interface RushedStats {
  uma1: { lengths: Array<number>; count: number };
  uma2: { lengths: Array<number>; count: number };
}

interface LeadCompetitionStats {
  uma1: { lengths: Array<number>; count: number };
  uma2: { lengths: Array<number>; count: number };
}

interface StaminaStats {
  uma1: { hpDiedCount: number; fullSpurtCount: number; total: number };
  uma2: { hpDiedCount: number; fullSpurtCount: number; total: number };
}

export function runComparison(params: RunComparisonParams): CompareResult {
  const { nsamples, course, racedef, runnerA, runnerB, pacer, options } = params;

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
    .accuracyMode(options.accuracyMode ?? false)
    .useEnhancedSpurt(options.useEnhancedSpurt ?? false)
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
  if (!options.allowRushedUma1) {
    runnerARaceSolver.disableRushed();
  }

  if (!options.allowRushedUma2) {
    runnerBRaceSolver.disableRushed();
  }

  // Apply downhill toggles
  if (!options.allowDownhillUma1) {
    runnerARaceSolver.disableDownhill();
  }

  if (!options.allowDownhillUma2) {
    runnerBRaceSolver.disableDownhill();
  }

  if (!options.allowSectionModifierUma1) {
    runnerARaceSolver.disableSectionModifier();
  }

  if (!options.allowSectionModifierUma2) {
    runnerBRaceSolver.disableSectionModifier();
  }

  // Apply skill check chance toggle
  if (!options.skillCheckChanceUma1) {
    runnerARaceSolver.skillCheckChance(false);
  }

  if (!options.skillCheckChanceUma2) {
    runnerBRaceSolver.skillCheckChance(false);
  }

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

  // standard.withAsiwotameru().withStaminaSyoubu();
  // compare.withAsiwotameru().withStaminaSyoubu();

  let pacerHorse = null;

  if (options.posKeepMode === PosKeepMode.Approximate) {
    pacerHorse = runnerARaceSolver.useDefaultPacer(true);
  } else if (options.posKeepMode === PosKeepMode.Virtual) {
    if (pacer) {
      const pacerConfig: RunnerState = { ...pacer };
      pacerHorse = runnerARaceSolver.pacer(pacerConfig);

      if (
        pacerConfig.skills &&
        Array.isArray(pacerConfig.skills) &&
        pacerConfig.skills.length > 0
      ) {
        pacerConfig.skills.forEach((skillId: string) => {
          const cleanSkillId = skillId.split('-')[0];
          runnerARaceSolver.addPacerSkill(cleanSkillId);
        });
      }
    } else {
      pacerHorse = runnerARaceSolver.useDefaultPacer();
    }
  }

  const runnerASkillActivations: Map<string, Array<SkillActivation>> = new Map();
  const runnerBSkillActivations: Map<string, Array<SkillActivation>> = new Map();

  const getActivator = (
    skillsSet: Map<string, Array<SkillActivation>>,
    othersSet: Map<string, Array<SkillActivation>>,
  ) => {
    return (
      raceSolver: RaceSolver,
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
        const skillSetValue = skillsSet.get(executionId) ?? [];

        skillSetValue.push({
          executionId,
          skillId,
          start: currentPosition,
          end: currentPosition,
          perspective,
          effectType,
          effectTarget,
        });

        skillsSet.set(executionId, skillSetValue);
      }

      if (effectTarget !== SkillTarget.Self) {
        const skillSetValue = othersSet.get(executionId) ?? [];

        skillSetValue.push({
          executionId,
          skillId,
          start: currentPosition,
          end: currentPosition,
          perspective,
          effectType,
          effectTarget,
        });

        othersSet.set(executionId, skillSetValue);
      }
    };
  };

  const getDeactivator = (
    skillsSet: Map<string, Array<SkillActivation>>,
    _othersSet: Map<string, Array<SkillActivation>>,
  ) => {
    return (
      _raceSolver: RaceSolver,
      currentPosition: number,
      executionId: string,
      skillId: string,
      _perspective: ISkillPerspective,
      _effectType: ISkillType,
      _effectTarget: ISkillTarget,
    ) => {
      if (['asitame', 'staminasyoubu'].includes(skillId)) {
        return;
      }

      const skillActivations = skillsSet.get(executionId);

      if (skillActivations && skillActivations.length > 0) {
        const firstActivation = skillActivations?.[0];

        for (let i = 0; i < skillActivations.length; i++) {
          if (skillActivations[i].effectType === SkillType.Recovery) continue;

          if (currentPosition > firstActivation.start) {
            skillActivations[i].end = Math.min(currentPosition, course.distance);
          }
        }

        skillsSet.set(executionId, skillActivations);
      }
    };
  };

  // Runner A Solver:
  // Self → skillPos1
  // Other -> skillPos2
  runnerARaceSolver.onSkillActivate(getActivator(runnerASkillActivations, runnerBSkillActivations));
  runnerARaceSolver.onSkillDeactivate(
    getDeactivator(runnerASkillActivations, runnerBSkillActivations),
  );

  // Runner B Solver:
  // Self → skillPos2
  // Other -> skillPos1
  runnerBRaceSolver.onSkillActivate(getActivator(runnerBSkillActivations, runnerASkillActivations));
  runnerBRaceSolver.onSkillDeactivate(
    getDeactivator(runnerBSkillActivations, runnerASkillActivations),
  );

  const a = runnerARaceSolver.build();
  const b = runnerBRaceSolver.build();

  const runnerAIndex = 0;
  const runnerBIndex = 1;

  const sign = 1;
  const diff = [];

  let min = Infinity;
  let max = -Infinity;
  let estMean = 0;
  let estMedian = 0;
  let bestMeanDiff = Infinity;
  let bestMedianDiff = Infinity;

  let minrun: SimulationRun = initializeSimulationRun();
  let maxrun: SimulationRun = initializeSimulationRun();
  let meanrun: SimulationRun = initializeSimulationRun();
  let medianrun: SimulationRun = initializeSimulationRun();

  const sampleCutoff = Math.max(Math.floor(nsamples * 0.8), nsamples - 200);

  let retry = false;

  // Track rushed statistics across all simulations
  const rushedStats: RushedStats = {
    uma1: { lengths: [], count: 0 },
    uma2: { lengths: [], count: 0 },
  };

  const leadCompetitionStats: LeadCompetitionStats = {
    uma1: { lengths: [], count: 0 },
    uma2: { lengths: [], count: 0 },
  };

  // Track stamina survival and full spurt statistics
  const staminaStats: StaminaStats = {
    uma1: { hpDiedCount: 0, fullSpurtCount: 0, total: 0 },
    uma2: { hpDiedCount: 0, fullSpurtCount: 0, total: 0 },
  };

  // Track last spurt 1st place frequency
  // This is primarily useful for front runners where we want to evaluate how effective
  // they are at getting angling & scheming
  //
  // note: eventually we could also even limit angling & scheming proc to only occur
  // when the uma is *actually* 1st place in the sim instead of using a probability estimate?
  const firstUmaStats = {
    uma1: { firstPlaceCount: 0, total: 0 },
    uma2: { firstPlaceCount: 0, total: 0 },
  };

  // Track which generator corresponds to which uma (flips when we swap generators)
  const aIsUma1 = true; // 'a' starts as standard builder (uma1)

  // offset the seed by 500 to avoid conflicts with the umas
  const basePacersSeed = 500 + seed;

  for (let i = 0; i < nsamples; ++i) {
    const pacers: Array<RaceSolver> = [];

    // Create fresh pacer RNG for each race to avoid state accumulation
    // This ensures each race gets independent, reproducible pacer behavior
    const basePacerRng = new Rule30CARng(basePacersSeed + i);

    for (let j = 0; j < options.pacemakerCount; ++j) {
      const pacerRng = new Rule30CARng(basePacerRng.int32());
      const pacer: RaceSolver | null = pacerHorse
        ? runnerARaceSolver.buildPacer(pacerHorse, i, pacerRng)
        : null;

      if (pacer) {
        pacers.push(pacer);
      }
    }

    const pacer: RaceSolver | null = pacers.length > 0 ? pacers[0] : null;

    const solverA = a.next(retry).value as RaceSolver;
    const solverB = b.next(retry).value as RaceSolver;

    const data: SimulationRun = initializeSimulationRun();

    // Solver A faces solver B and the pacers
    solverA.initUmas([solverB, ...pacers]);
    // Solver B faces solver A and the pacers
    solverB.initUmas([solverA, ...pacers]);

    // Each pacer faces solver A and solver B and the other pacers
    pacers.forEach((p) => {
      p?.initUmas([solverA, solverB, ...pacers.filter((p2) => p2 !== p)]);
    });

    let solverAFinished = false;
    let solverBFinished = false;

    // Difference in position between solver A and solver B
    let positionDiff = 0;

    while (!solverAFinished || !solverBFinished) {
      let currentPacer: RaceSolver | null = null;

      if (pacer) {
        currentPacer = pacer.getPacer();

        pacer.umas.forEach((runner) => {
          if (currentPacer) {
            runner.updatePacer(currentPacer);
          }
        });
      }

      // Update pacer gap for solver B
      if (solverB.pos < course.distance) {
        if (currentPacer) {
          data.pacerGap[runnerBIndex].push(currentPacer.pos - solverB.pos);
        }
      }

      // Update pacer gap for solver A
      if (solverA.pos < course.distance) {
        if (currentPacer) {
          data.pacerGap[runnerAIndex].push(currentPacer.pos - solverA.pos);
        }
      }

      // Update pacer data for each pacer
      for (let j = 0; j < options.pacemakerCount; j++) {
        const currentPacer = j < pacers.length ? pacers[j] : null;

        if (!currentPacer || currentPacer.pos >= course.distance) continue;

        currentPacer.step(1 / 15);
        data.pacerV[j].push(
          currentPacer.currentSpeed +
            (currentPacer.modifiers.currentSpeed.acc + currentPacer.modifiers.currentSpeed.err),
        );

        data.pacerP[j].push(currentPacer.pos);
        data.pacerT[j].push(currentPacer.accumulatetime.t);
      }

      // Update solver B
      if (solverB.pos < course.distance) {
        // Step solver B for 1/15 seconds
        solverB.step(1 / 15);

        const currentVelocity =
          solverB.currentSpeed +
          (solverB.modifiers.currentSpeed.acc + solverB.modifiers.currentSpeed.err);

        data.t[runnerBIndex].push(solverB.accumulatetime.t);
        data.p[runnerBIndex].push(solverB.pos);

        data.v[runnerBIndex].push(currentVelocity);
        data.hp[runnerBIndex].push(solverB.hp.hp);
        data.currentLane[runnerBIndex].push(solverB.currentLane);
      } else if (!solverBFinished) {
        // Solver B has finished the race
        solverBFinished = true;

        data.sdly[runnerBIndex] = solverB.startDelay;
        data.rushed[runnerBIndex] = solverB.rushedActivations.slice();
        data.posKeep[runnerBIndex] = solverB.positionKeepActivations.slice();

        // Update dueling stats
        if (solverB.competeFightStart != null) {
          data.competeFight[runnerBIndex] = [
            solverB.competeFightStart,
            solverB.competeFightEnd != null ? solverB.competeFightEnd : course.distance,
          ];
        }

        // Update Spot Struggle stats
        if (solverB.leadCompetitionStart != null) {
          data.leadCompetition[runnerBIndex] = [
            solverB.leadCompetitionStart,
            solverB.leadCompetitionEnd != null ? solverB.leadCompetitionEnd : course.distance,
          ];
        }
      }

      // Update solver A
      if (solverA.pos < course.distance) {
        // Step solver A for 1/15 seconds
        solverA.step(1 / 15);

        const currentVelocity =
          solverA.currentSpeed +
          (solverA.modifiers.currentSpeed.acc + solverA.modifiers.currentSpeed.err);

        data.t[runnerAIndex].push(solverA.accumulatetime.t);
        data.p[runnerAIndex].push(solverA.pos);
        data.v[runnerAIndex].push(currentVelocity);
        data.hp[runnerAIndex].push(solverA.hp.hp);

        data.currentLane[runnerAIndex].push(solverA.currentLane);
      } else if (!solverAFinished) {
        // Solver A has finished the race
        solverAFinished = true;

        data.sdly[runnerAIndex] = solverA.startDelay;
        data.rushed[runnerAIndex] = solverA.rushedActivations.slice();
        data.posKeep[runnerAIndex] = solverA.positionKeepActivations.slice();

        // Update dueling stats
        if (solverA.competeFightStart != null) {
          data.competeFight[runnerAIndex] = [
            solverA.competeFightStart,
            solverA.competeFightEnd != null ? solverA.competeFightEnd : course.distance,
          ];
        }

        // Update Spot Struggle stats
        if (solverA.leadCompetitionStart != null) {
          data.leadCompetition[runnerAIndex] = [
            solverA.leadCompetitionStart,
            solverA.leadCompetitionEnd != null ? solverA.leadCompetitionEnd : course.distance,
          ];
        }
      }

      // Update first UMA in late race stats
      solverB.updatefirstUmaInLateRace();
    }

    // Runner A took less time to finish (less frames to finish)
    if (data.p[runnerBIndex].length <= data.p[runnerAIndex].length) {
      const runneAFrames = data.p[runnerBIndex].length;
      positionDiff =
        data.p[runnerBIndex][runneAFrames - 1] - data.p[runnerAIndex][runneAFrames - 1];
    } else {
      const runnerBFrames = data.p[runnerAIndex].length;
      positionDiff =
        data.p[runnerBIndex][runnerBFrames - 1] - data.p[runnerAIndex][runnerBFrames - 1];
    }

    pacers.forEach((p) => {
      if (p && p.pos < course.distance) {
        p.step(1 / 15);

        for (let pacemakerIndex = 0; pacemakerIndex < 3; pacemakerIndex++) {
          if (pacemakerIndex < pacers.length && pacers[pacemakerIndex] === p) {
            data.pacerV[pacemakerIndex].push(
              p.currentSpeed + (p.modifiers.currentSpeed.acc + p.modifiers.currentSpeed.err),
            );
            data.pacerP[pacemakerIndex].push(p.pos);
            data.pacerT[pacemakerIndex].push(p.accumulatetime.t);
          }
        }
      }
    });

    for (let j = 0; j < options.pacemakerCount; j++) {
      const p = j < pacers.length ? pacers[j] : null;
      data.pacerPosKeep[j] = p ? p.positionKeepActivations.slice() : [];
      if (p && p.leadCompetitionStart != null) {
        data.pacerLeadCompetition[j] = [
          p.leadCompetitionStart,
          p.leadCompetitionEnd != null ? p.leadCompetitionEnd : course.distance,
        ];
      } else {
        data.pacerLeadCompetition[j] = [];
      }
    }

    // Clean up skills that are still active when the race ends
    // This ensures skills that activate near the finish line get proper end positions
    // Also handles skills with very short durations that might deactivate in the same frame
    const cleanupActiveSkills = (
      solver: RaceSolver,
      selfSkillSet: Map<string, Array<SkillActivation>>,
      othersSkillSet: Map<string, Array<SkillActivation>>,
    ) => {
      const callDeactivator = (skill: ActiveSkill) => {
        // Call the deactivator to set the end position to course.distance
        // This handles both race-end cleanup and very short duration skills
        // Use the correct skill position maps for this solver
        const currentPosition = solver.pos;
        getDeactivator(selfSkillSet, othersSkillSet)(
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
    cleanupActiveSkills(solverA, runnerASkillActivations, runnerBSkillActivations);
    cleanupActiveSkills(solverB, runnerBSkillActivations, runnerASkillActivations);

    data.sk[0] = Object.fromEntries(runnerASkillActivations);
    data.sk[1] = Object.fromEntries(runnerBSkillActivations);

    // Clear the maps instead of reassigning to preserve closure references
    runnerASkillActivations.clear();
    runnerBSkillActivations.clear();

    retry = false;

    // ONLY track stats for valid iterations (after swap check, but BEFORE cleanup)
    // Key insight: After swaps, s1 and s2 variable names don't tell us which uma they are!
    // We need to track which BUILDER (a or b) they came from:
    // - s1 always comes from generator 'a'
    // - s2 always comes from generator 'b'
    // - 'a' started as standard builder (uma1), 'b' started as compare builder (uma2)
    // - After swaps, 'a' might generate uma2 and 'b' might generate uma1
    // BUT: we swapped both the generators AND the indices, so:
    //   - If aIsUma1, then s1=uma1, s2=uma2
    //   - After swap: generators swap AND indices swap, so relationship stays same!

    // Actually wait, that's not right either. Let me think...
    // After [b,a]=[a,b], the generator that WAS producing uma1 is now in variable 'b'
    // And the generator that WAS producing uma2 is now in variable 'a'
    // So after swaps, aIsUma1 flips!

    // Determine which uma each solver represents based on current generator state
    // s1 came from generator 'a': if aIsUma1, then s1 is uma1, else s1 is uma2
    // s2 came from generator 'b': if aIsUma1, then s2 is uma2, else s2 is uma1
    const s1IsUma1 = aIsUma1;
    const s2IsUma1 = !aIsUma1;

    // Track stats for s1's uma
    const s1Stats = s1IsUma1 ? staminaStats.uma1 : staminaStats.uma2;
    s1Stats.total++;
    if (solverA.hpDied) {
      s1Stats.hpDiedCount++;
    }
    if (solverA.fullSpurt) {
      s1Stats.fullSpurtCount++;
    }

    // Track stats for s2's uma
    const s2Stats = s2IsUma1 ? staminaStats.uma1 : staminaStats.uma2;
    s2Stats.total++;
    if (solverB.hpDied) {
      s2Stats.hpDiedCount++;
    }
    if (solverB.fullSpurt) {
      s2Stats.fullSpurtCount++;
    }

    const s1FirstUmaStats = s1IsUma1 ? firstUmaStats.uma1 : firstUmaStats.uma2;
    s1FirstUmaStats.total++;
    if (solverA.firstUmaInLateRace) {
      s1FirstUmaStats.firstPlaceCount++;
    }

    const s2FirstUmaStats = s2IsUma1 ? firstUmaStats.uma1 : firstUmaStats.uma2;
    s2FirstUmaStats.total++;
    if (solverB.firstUmaInLateRace) {
      s2FirstUmaStats.firstPlaceCount++;
    }

    // Cleanup AFTER stat tracking
    solverB.cleanup();
    solverA.cleanup();

    // Collect rushed statistics (also based on which uma the solver represents)
    if (solverA.rushedActivations.length > 0) {
      const [start, end] = solverA.rushedActivations[0];
      const length = end - start;
      const s1RushedStats = s1IsUma1 ? rushedStats.uma1 : rushedStats.uma2;
      s1RushedStats.lengths.push(length);
      s1RushedStats.count++;
    }
    if (solverB.rushedActivations.length > 0) {
      const [start, end] = solverB.rushedActivations[0];
      const length = end - start;
      const s2RushedStats = s2IsUma1 ? rushedStats.uma1 : rushedStats.uma2;
      s2RushedStats.lengths.push(length);
      s2RushedStats.count++;
    }

    if (solverA.leadCompetitionStart != null) {
      const start = solverA.leadCompetitionStart;
      const end = solverA.leadCompetitionEnd != null ? solverA.leadCompetitionEnd : course.distance;
      const length = end - start;
      const s1LeadCompStats = s1IsUma1 ? leadCompetitionStats.uma1 : leadCompetitionStats.uma2;
      s1LeadCompStats.lengths.push(length);
      s1LeadCompStats.count++;
    }
    if (solverB.leadCompetitionStart != null) {
      const start = solverB.leadCompetitionStart;
      const end = solverB.leadCompetitionEnd != null ? solverB.leadCompetitionEnd : course.distance;
      const length = end - start;
      const s2LeadCompStats = s2IsUma1 ? leadCompetitionStats.uma1 : leadCompetitionStats.uma2;
      s2LeadCompStats.lengths.push(length);
      s2LeadCompStats.count++;
    }

    const basinn = (sign * positionDiff) / 2.5;
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
      const meanDiff = Math.abs(basinn - estMean),
        medianDiff = Math.abs(basinn - estMedian);
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

  // Calculate rushed statistics
  const calculateStats = (stats: { lengths: Array<number>; count: number }) => {
    if (stats.lengths.length === 0) {
      return { min: 0, max: 0, mean: 0, frequency: 0 };
    }

    const min = Math.min(...stats.lengths);
    const max = Math.max(...stats.lengths);
    const mean = stats.lengths.reduce((a, b) => a + b, 0) / stats.lengths.length;

    const frequency = (stats.count / nsamples) * 100; // percentage

    return { min, max, mean, frequency };
  };

  const rushedStatsSummary = {
    uma1: calculateStats(rushedStats.uma1),
    uma2: calculateStats(rushedStats.uma2),
  };

  const leadCompetitionStatsSummary = {
    uma1: calculateStats(leadCompetitionStats.uma1),
    uma2: calculateStats(leadCompetitionStats.uma2),
  };

  // Calculate stamina survival and full spurt rates
  const staminaStatsSummary = {
    uma1: {
      staminaSurvivalRate:
        staminaStats.uma1.total > 0
          ? ((staminaStats.uma1.total - staminaStats.uma1.hpDiedCount) / staminaStats.uma1.total) *
            100
          : 0,
      fullSpurtRate:
        staminaStats.uma1.total > 0
          ? (staminaStats.uma1.fullSpurtCount / staminaStats.uma1.total) * 100
          : 0,
    },
    uma2: {
      staminaSurvivalRate:
        staminaStats.uma2.total > 0
          ? ((staminaStats.uma2.total - staminaStats.uma2.hpDiedCount) / staminaStats.uma2.total) *
            100
          : 0,
      fullSpurtRate:
        staminaStats.uma2.total > 0
          ? (staminaStats.uma2.fullSpurtCount / staminaStats.uma2.total) * 100
          : 0,
    },
  };

  const firstUmaStatsSummary = {
    uma1: {
      firstPlaceRate:
        firstUmaStats.uma1.total > 0
          ? (firstUmaStats.uma1.firstPlaceCount / firstUmaStats.uma1.total) * 100
          : 0,
    },
    uma2: {
      firstPlaceRate:
        firstUmaStats.uma2.total > 0
          ? (firstUmaStats.uma2.firstPlaceCount / firstUmaStats.uma2.total) * 100
          : 0,
    },
  };

  // Each run (min, max, mean, median) already has its own rushed data from its actual simulation
  // We don't need to overwrite it - just ensure the rushed field is properly formatted
  // The rushed data comes from the RaceSolver.rushedActivations collected during each specific run

  return {
    results: diff,
    runData: { minrun, maxrun, meanrun, medianrun },
    rushedStats: rushedStatsSummary,
    leadCompetitionStats: leadCompetitionStatsSummary,
    // TODO: Add spurt info IF useEnhancedSpurt is true
    // spurtInfo: options.useEnhancedSpurt ? { uma1: {}, uma2: {} } : null,
    spurtInfo: null,
    staminaStats: staminaStatsSummary,
    firstUmaStats: firstUmaStatsSummary,
  };
}

export const run1Round = (params: Run1RoundParams) => {
  const { nsamples, skills, course, racedef, uma, pacer, options } = params;

  const data: SkillBasinResponse = {};

  skills.forEach((id) => {
    const withSkill = cloneDeep(uma);
    withSkill.skills.push(id);

    const { results, runData } = runComparison({
      nsamples,
      course,
      racedef,
      runnerA: uma,
      runnerB: withSkill,
      pacer,
      options,
    });

    const mid = Math.floor(results.length / 2);
    const median = results.length % 2 == 0 ? (results[mid - 1] + results[mid]) / 2 : results[mid];

    const mean = results.reduce((a, b) => a + b, 0) / results.length;

    data[id] = {
      id,
      results,
      runData,
      min: results[0],
      max: results[results.length - 1],
      mean,
      median,
    };
  });

  return data;
};
