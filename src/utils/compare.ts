import { CourseData } from '@/modules/simulation/lib/courses/types';
import { GroundCondition } from '@simulation/lib/RaceParameters';
import { PosKeepMode, RaceSolver } from '@simulation/lib/RaceSolver';
import {
  ISkillPerspective,
  SkillPerspective,
} from '@simulation/lib/race-solver/types';

import {
  RaceSolverBuilder,
  buildAdjustedStats,
  buildBaseStats,
  parseAptitude,
  parseStrategy,
} from '@simulation/lib/RaceSolverBuilder';

import { Rule30CARng } from '@simulation/lib/Random';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { CompareResult, SimulationRun } from '@simulation/compare.types';
import { getSkillDataById } from '@/modules/skills/utils';
import {
  RunComparisonParams,
  SkillBasinResponse,
  TheoreticalMaxSpurtResult,
  type Run1RoundParams,
} from '@/modules/simulation/types';

export function calculateTheoreticalMaxSpurt(
  horse: RunnerState,
  course: CourseData,
  ground: GroundCondition,
): TheoreticalMaxSpurtResult {
  const HpStrategyCoefficient = [0, 0.95, 0.89, 1.0, 0.995, 0.86];
  const HpConsumptionGroundModifier = [
    [],
    [0, 1.0, 1.0, 1.02, 1.02],
    [0, 1.0, 1.0, 1.01, 1.02],
  ];
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
  const maxHp =
    0.8 * HpStrategyCoefficient[strategy] * horse.stamina + course.distance;
  const groundModifier = HpConsumptionGroundModifier[course.surface][ground];
  const gutsModifier = 1.0 + 200.0 / Math.sqrt(600.0 * horse.guts);

  // Calculate base target speed for phase 2
  const baseTargetSpeed2 =
    baseSpeed * StrategyPhaseCoefficient[strategy][2] +
    Math.sqrt(500.0 * horse.speed) *
      DistanceProficiencyModifier[distanceAptitude] *
      0.002;

  // Calculate max spurt speed
  const maxSpurtSpeed =
    (baseSpeed * (StrategyPhaseCoefficient[strategy][2] + 0.01) +
      Math.sqrt(horse.speed / 500.0) *
        DistanceProficiencyModifier[distanceAptitude]) *
      1.05 +
    Math.sqrt(500.0 * horse.speed) *
      DistanceProficiencyModifier[distanceAptitude] *
      0.002 +
    Math.pow(450.0 * horse.guts, 0.597) * 0.0001;

  // Calculate HP consumption for the entire race
  // Phase 0: 0 to 1/6 of course (acceleration phase)
  const phase0Distance = course.distance / 6;
  const phase0Speed = baseSpeed * StrategyPhaseCoefficient[strategy][0];
  const phase0HpPerSec =
    ((20.0 * Math.pow(phase0Speed - baseSpeed + 12.0, 2)) / 144.0) *
    groundModifier;
  const phase0Time = phase0Distance / phase0Speed;
  const phase0Hp = phase0HpPerSec * phase0Time;

  // Phase 1: 1/6 to 2/3 of course (middle phase)
  const phase1Distance = (course.distance * 2) / 3 - phase0Distance;
  const phase1Speed = baseSpeed * StrategyPhaseCoefficient[strategy][1];
  const phase1HpPerSec =
    ((20.0 * Math.pow(phase1Speed - baseSpeed + 12.0, 2)) / 144.0) *
    groundModifier;
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
  uma1: { lengths: number[]; count: number };
  uma2: { lengths: number[]; count: number };
}

interface LeadCompetitionStats {
  uma1: { lengths: number[]; count: number };
  uma2: { lengths: number[]; count: number };
}

interface StaminaStats {
  uma1: { hpDiedCount: number; fullSpurtCount: number; total: number };
  uma2: { hpDiedCount: number; fullSpurtCount: number; total: number };
}

export function runComparison(params: RunComparisonParams): CompareResult {
  const { nsamples, course, racedef, runnerA, runnerB, pacer, options } =
    params;

  const { includeRunData = true } = options;

  // Pre-calculate heal skills from uma's skill lists before race starts
  const uma1HealSkills = [];
  const uma2HealSkills = [];

  for (const skillId of runnerA.skills) {
    const skill = getSkillDataById(skillId);
    if (!skill) continue;

    for (const alt of skill.alternatives) {
      if (!alt.effects) continue;

      for (const effect of alt.effects) {
        if (effect.type === 9) {
          // Recovery/Heal skill
          uma1HealSkills.push({
            id: skillId,
            heal: effect.modifier,
            duration: alt.baseDuration || 0,
          });
        }
      }
    }
  }

  for (const skillId of runnerB.skills) {
    const skill = getSkillDataById(skillId);
    if (!skill) continue;

    for (const alt of skill.alternatives) {
      if (!alt.effects) continue;
      for (const effect of alt.effects) {
        if (effect.type === 9) {
          // Recovery/Heal skill
          uma2HealSkills.push({
            id: skillId,
            heal: effect.modifier,
            duration: alt.baseDuration || 0,
          });
        }
      }
    }
  }

  const seed = options.seed ?? 0;
  const posKeepMode = options.posKeepMode ?? PosKeepMode.None;
  const mode = options.mode ?? 'compare';
  const numUmas = racedef.numUmas ?? 1;

  const standard = new RaceSolverBuilder(nsamples)
    .seed(seed)
    .course(course)
    .ground(racedef.groundCondition)
    .weather(racedef.weather)
    .season(racedef.season)
    .time(racedef.time)
    .useEnhancedSpurt(options.useEnhancedSpurt ?? false)
    .accuracyMode(options.accuracyMode ?? false)
    .posKeepMode(posKeepMode)
    .mode(mode);

  if (racedef.orderRange != null) {
    standard
      .order(racedef.orderRange[0], racedef.orderRange[1])
      .numUmas(numUmas);
  }

  // Fork to share RNG - both horses face the same random events for fair comparison
  const compare = standard.fork();

  if (options.mode === 'compare') {
    standard.desync();
  }

  standard.horse(runnerA);
  compare.horse(runnerB);

  // Apply rushed toggles
  if (!options.allowRushedUma1) {
    standard.disableRushed();
  }

  if (!options.allowRushedUma2) {
    compare.disableRushed();
  }

  // Apply downhill toggles
  if (!options.allowDownhillUma1) {
    standard.disableDownhill();
  }

  if (!options.allowDownhillUma2) {
    compare.disableDownhill();
  }

  if (!options.allowSectionModifierUma1) {
    standard.disableSectionModifier();
  }

  if (!options.allowSectionModifierUma2) {
    compare.disableSectionModifier();
  }

  // Apply skill check chance toggle
  if (!options.skillCheckChanceUma1) {
    standard.skillCheckChance(false);
  }

  if (!options.skillCheckChanceUma2) {
    compare.skillCheckChance(false);
  }

  // ensure skills common to the two umas are added in the same order regardless of what additional skills they have
  // this is important to make sure the rng for their activations is synced

  const commonSkills = [...runnerA.skills, ...runnerB.skills].toSorted(
    (a, b) => +a - +b,
  );

  const getCommonIndex = (id: string) => {
    const index = commonSkills.indexOf(id);

    return index > -1 ? index : commonSkills.length;
  };

  const skillSorter = (a: string, b: string) =>
    getCommonIndex(a) - getCommonIndex(b) || +a - +b;

  const uma1Horse = { ...runnerA };
  const uma1BaseStats = buildBaseStats(uma1Horse);
  const uma1AdjustedStats = buildAdjustedStats(
    uma1BaseStats,
    course,
    racedef.groundCondition,
  );
  const uma1Wisdom = uma1AdjustedStats.wisdom;

  const uma2Horse = { ...runnerB };
  const uma2BaseStats = buildBaseStats(uma2Horse);
  const uma2AdjustedStats = buildAdjustedStats(
    uma2BaseStats,
    course,
    racedef.groundCondition,
  );

  const uma2Wisdom = uma2AdjustedStats.wisdom;

  const runnerASortedSkills = runnerA.skills.toSorted(skillSorter);

  for (const id of runnerASortedSkills) {
    const skillId = id.split('-')[0];
    const forcedPos = runnerA.forcedSkillPositions[id];

    if (forcedPos != null) {
      standard.addSkillAtPosition(skillId, forcedPos, SkillPerspective.Self);
      compare.addSkill(skillId, SkillPerspective.Other, undefined, uma1Wisdom);
    } else {
      standard.addSkill(skillId, SkillPerspective.Self);
      compare.addSkill(skillId, SkillPerspective.Other, undefined, uma1Wisdom);
    }
  }

  const runnerBSortedSkills = runnerB.skills.toSorted(skillSorter);

  for (const id of runnerBSortedSkills) {
    const skillId = id.split('-')[0];
    const forcedPos = runnerB.forcedSkillPositions[id];

    if (forcedPos != null) {
      compare.addSkillAtPosition(skillId, forcedPos, SkillPerspective.Self);
      standard.addSkill(skillId, SkillPerspective.Other, undefined, uma2Wisdom);
    } else {
      compare.addSkill(skillId, SkillPerspective.Self);
      standard.addSkill(skillId, SkillPerspective.Other, undefined, uma2Wisdom);
    }
  }

  // standard.withAsiwotameru().withStaminaSyoubu();
  // compare.withAsiwotameru().withStaminaSyoubu();

  let pacerHorse = null;

  if (options.posKeepMode === PosKeepMode.Approximate) {
    pacerHorse = standard.useDefaultPacer(true);
  } else if (options.posKeepMode === PosKeepMode.Virtual) {
    if (pacer) {
      const pacerConfig: RunnerState = { ...pacer };
      pacerHorse = standard.pacer(pacerConfig);

      if (
        pacerConfig.skills &&
        Array.isArray(pacerConfig.skills) &&
        pacerConfig.skills.length > 0
      ) {
        pacerConfig.skills.forEach((skillId: string) => {
          const cleanSkillId = skillId.split('-')[0];
          standard.addPacerSkill(cleanSkillId);
        });
      }
    } else {
      pacerHorse = standard.useDefaultPacer();
    }
  }

  const skillPos1: Map<string, [number, number][]> = new Map();
  const skillPos2: Map<string, [number, number][]> = new Map();
  // Separate tracking for debuffs received by each runner
  const debuffsReceived1: Map<string, [number, number][]> = new Map();
  const debuffsReceived2: Map<string, [number, number][]> = new Map();

  const getActivator = (
    selfSet: Map<string, [number, number][]>,
    otherSet: Map<string, [number, number][]>,
    debuffsReceivedSet: Map<string, [number, number][]>,
  ) => {
    return (
      raceSolver: RaceSolver,
      skillId: string,
      perspective?: ISkillPerspective,
    ) => {
      // Self skills go to selfSet, Other skills go to both otherSet (for backward compat) and debuffsReceivedSet
      const skillSet =
        perspective === SkillPerspective.Self ? selfSet : otherSet;

      if (!['asitame', 'staminasyoubu'].includes(skillId)) {
        const skillSetValue = skillSet.get(skillId) ?? [];
        skillSetValue.push([raceSolver.pos, raceSolver.pos]); // Initialize with same position for instant skills
        skillSet.set(skillId, skillSetValue);

        // Also track debuffs received separately for the affected runner
        if (perspective === SkillPerspective.Other) {
          const debuffsReceivedSetValue = debuffsReceivedSet.get(skillId) ?? [];
          debuffsReceivedSetValue.push([raceSolver.pos, raceSolver.pos]);

          debuffsReceivedSet.set(skillId, debuffsReceivedSetValue);
        }
      }
    };
  };

  const getDeactivator = (
    selfSet: Map<string, [number, number][]>,
    otherSet: Map<string, [number, number][]>,
    debuffsReceivedSet: Map<string, [number, number][]>,
  ) => {
    return (
      raceSolver: RaceSolver,
      skillId: string,
      perspective?: ISkillPerspective,
    ) => {
      const skillSet =
        perspective === SkillPerspective.Self ? selfSet : otherSet;

      if (!['asitame', 'staminasyoubu'].includes(skillId)) {
        const ar = skillSet.get(skillId); // activation record

        if (ar && ar.length > 0) {
          // Only update if this is a duration skill (position has moved)
          const activationPos = ar[ar.length - 1][0];

          if (raceSolver.pos > activationPos) {
            ar[ar.length - 1][1] = Math.min(raceSolver.pos, course.distance);
          }
        }

        // Also update debuffs received
        if (perspective === SkillPerspective.Other) {
          const debuffAr = debuffsReceivedSet.get(skillId);
          if (debuffAr && debuffAr.length > 0) {
            const activationPos = debuffAr[debuffAr.length - 1][0];
            if (raceSolver.pos > activationPos) {
              debuffAr[debuffAr.length - 1][1] = Math.min(
                raceSolver.pos,
                course.distance,
              );
            }
          }
        }
      }
    };
  };

  // standard (uma1's solver): Self → skillPos1, Other (debuffs uma1 receives) → debuffsReceived1
  standard.onSkillActivate(
    getActivator(skillPos1, skillPos2, debuffsReceived1),
  );
  standard.onSkillDeactivate(
    getDeactivator(skillPos1, skillPos2, debuffsReceived1),
  );

  // compare (uma2's solver): Self → skillPos2, Other (debuffs uma2 receives) → debuffsReceived2
  compare.onSkillActivate(getActivator(skillPos2, skillPos1, debuffsReceived2));
  compare.onSkillDeactivate(
    getDeactivator(skillPos2, skillPos1, debuffsReceived2),
  );

  const a = standard.build();
  const b = compare.build();

  const runnerAIndex = 0;
  const runnerBIndex = 1;

  const sign = 1;
  const diff = [];

  let min: number = Infinity;
  let max: number = -Infinity;
  let estMean: number = 0;
  let estMedian: number = 0;
  let bestMeanDiff: number = Infinity;
  let bestMedianDiff: number = Infinity;

  const initialSimulationRun: SimulationRun = {
    t: [[], []],
    p: [[], []],
    v: [[], []],
    hp: [[], []],
    currentLane: [[], []],
    pacerGap: [[], []],
    sk: [new Map(), new Map()],
    debuffsReceived: [new Map(), new Map()],
    sdly: [0, 0],
    rushed: [[], []],
    posKeep: [[], []],
    competeFight: [[], []],
    leadCompetition: [[], []],
    pacerV: [[], [], []],
    pacerP: [[], [], []],
    pacerT: [[], [], []],
    pacerPosKeep: [[], [], []],
    pacerLeadCompetition: [[], [], []],
  };

  let minrun: SimulationRun = initialSimulationRun;
  let maxrun: SimulationRun = initialSimulationRun;
  let meanrun: SimulationRun = initialSimulationRun;
  let medianrun: SimulationRun = initialSimulationRun;

  const sampleCutoff = Math.max(Math.floor(nsamples * 0.8), nsamples - 200);

  let retry: boolean = false;

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

  const basePacerRng = new Rule30CARng(options.seed ?? 0 + 1);

  for (let i = 0; i < nsamples; ++i) {
    const pacers: RaceSolver[] = [];

    for (let j = 0; j < options.pacemakerCount; ++j) {
      const pacerRng = new Rule30CARng(basePacerRng.int32());
      const pacer: RaceSolver | null = pacerHorse
        ? standard.buildPacer(pacerHorse, i, pacerRng)
        : null;

      if (pacer) {
        pacers.push(pacer);
      }
    }

    const pacer: RaceSolver | null = pacers.length > 0 ? pacers[0] : null;

    const s1 = a.next(retry).value as RaceSolver;
    const s2 = b.next(retry).value as RaceSolver;
    const data: SimulationRun = {
      t: [[], []],
      p: [[], []],
      v: [[], []],
      hp: [[], []],
      currentLane: [[], []],
      pacerGap: [[], []],
      sk: [new Map(), new Map()],
      debuffsReceived: [new Map(), new Map()],
      sdly: [0, 0],
      rushed: [[], []],
      posKeep: [[], []],
      competeFight: [[], []],
      leadCompetition: [[], []],
      pacerV: [[], [], []],
      pacerP: [[], [], []],
      pacerT: [[], [], []],
      pacerPosKeep: [[], [], []],
      pacerLeadCompetition: [[], [], []],
    };

    s1.initUmas([s2, ...pacers]);
    s2.initUmas([s1, ...pacers]);

    pacers.forEach((p) => {
      p?.initUmas([s1, s2, ...pacers.filter((p2) => p2 !== p)]);
    });

    let s1Finished = false;
    let s2Finished = false;
    let posDifference = 0;

    while (!s1Finished || !s2Finished) {
      let currentPacer: RaceSolver | null = null;

      if (pacer) {
        currentPacer = pacer.getPacer();

        pacer.umas.forEach((runner) => {
          if (currentPacer) {
            runner.updatePacer(currentPacer);
          }
        });
      }

      if (s2.pos < course.distance) {
        if (currentPacer) {
          data.pacerGap[runnerBIndex].push(currentPacer.pos - s2.pos);
        }
      }
      if (s1.pos < course.distance) {
        if (currentPacer) {
          data.pacerGap[runnerAIndex].push(currentPacer.pos - s1.pos);
        }
      }

      for (let j = 0; j < options.pacemakerCount; j++) {
        const currentPacer = j < pacers.length ? pacers[j] : null;

        if (!currentPacer || currentPacer.pos >= course.distance) continue;

        currentPacer.step(1 / 15);
        data.pacerV[j].push(
          currentPacer.currentSpeed +
            (currentPacer.modifiers.currentSpeed.acc +
              currentPacer.modifiers.currentSpeed.err),
        );

        data.pacerP[j].push(currentPacer.pos);
        data.pacerT[j].push(currentPacer.accumulatetime.t);
      }

      if (s2.pos < course.distance) {
        s2.step(1 / 15);

        data.t[runnerBIndex].push(s2.accumulatetime.t);
        data.p[runnerBIndex].push(s2.pos);
        data.v[runnerBIndex].push(
          s2.currentSpeed +
            (s2.modifiers.currentSpeed.acc + s2.modifiers.currentSpeed.err),
        );
        data.hp[runnerBIndex].push(s2.hp.hp);
        data.currentLane[runnerBIndex].push(s2.currentLane);
      } else if (!s2Finished) {
        s2Finished = true;

        data.sdly[runnerBIndex] = s2.startDelay;
        data.rushed[runnerBIndex] = s2.rushedActivations.slice();
        data.posKeep[runnerBIndex] = s2.positionKeepActivations.slice();
        if (s2.competeFightStart != null) {
          data.competeFight[runnerBIndex] = [
            s2.competeFightStart,
            s2.competeFightEnd != null ? s2.competeFightEnd : course.distance,
          ];
        }
        if (s2.leadCompetitionStart != null) {
          data.leadCompetition[runnerBIndex] = [
            s2.leadCompetitionStart,
            s2.leadCompetitionEnd != null
              ? s2.leadCompetitionEnd
              : course.distance,
          ];
        }
      }

      if (s1.pos < course.distance) {
        s1.step(1 / 15);

        data.t[runnerAIndex].push(s1.accumulatetime.t);
        data.p[runnerAIndex].push(s1.pos);
        data.v[runnerAIndex].push(
          s1.currentSpeed +
            (s1.modifiers.currentSpeed.acc + s1.modifiers.currentSpeed.err),
        );
        data.hp[runnerAIndex].push(s1.hp.hp);
        data.currentLane[runnerAIndex].push(s1.currentLane);
      } else if (!s1Finished) {
        s1Finished = true;

        data.sdly[runnerAIndex] = s1.startDelay;
        data.rushed[runnerAIndex] = s1.rushedActivations.slice();
        data.posKeep[runnerAIndex] = s1.positionKeepActivations.slice();
        if (s1.competeFightStart != null) {
          data.competeFight[runnerAIndex] = [
            s1.competeFightStart,
            s1.competeFightEnd != null ? s1.competeFightEnd : course.distance,
          ];
        }
        if (s1.leadCompetitionStart != null) {
          data.leadCompetition[runnerAIndex] = [
            s1.leadCompetitionStart,
            s1.leadCompetitionEnd != null
              ? s1.leadCompetitionEnd
              : course.distance,
          ];
        }
      }

      s2.updatefirstUmaInLateRace();
    }

    // ai took less time to finish (less frames to finish)
    if (data.p[runnerBIndex].length <= data.p[runnerAIndex].length) {
      const aiFrames = data.p[runnerBIndex].length;
      posDifference =
        data.p[runnerBIndex][aiFrames - 1] - data.p[runnerAIndex][aiFrames - 1];
    } else {
      const biFrames = data.p[runnerAIndex].length;
      posDifference =
        data.p[runnerBIndex][biFrames - 1] - data.p[runnerAIndex][biFrames - 1];
    }

    pacers.forEach((p) => {
      if (p && p.pos < course.distance) {
        p.step(1 / 15);

        for (let pacemakerIndex = 0; pacemakerIndex < 3; pacemakerIndex++) {
          if (pacemakerIndex < pacers.length && pacers[pacemakerIndex] === p) {
            data.pacerV[pacemakerIndex].push(
              p.currentSpeed +
                (p.modifiers.currentSpeed.acc + p.modifiers.currentSpeed.err),
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
      selfSkillSet: Map<string, [number, number][]>,
      otherSkillSet: Map<string, [number, number][]>,
      debuffsReceivedSet: Map<string, [number, number][]>,
    ) => {
      const allActiveSkills = [
        ...solver.activeTargetSpeedSkills,
        ...solver.activeCurrentSpeedSkills,
        ...solver.activeAccelSkills,
      ];

      allActiveSkills.forEach((skill) => {
        // Call the deactivator to set the end position to course.distance
        // This handles both race-end cleanup and very short duration skills
        // Use the correct skill position maps for this solver
        getDeactivator(selfSkillSet, otherSkillSet, debuffsReceivedSet)(
          solver,
          skill.skillId,
          skill.perspective,
        );
      });
    };

    // Clean up active skills for both horses
    // s1 comes from generator 'a' (standard), s2 comes from generator 'b' (compare)
    // standard uses skillPos1 for self, skillPos2 for other, debuffsReceived1 for debuffs received
    // compare uses skillPos2 for self, skillPos1 for other, debuffsReceived2 for debuffs received
    cleanupActiveSkills(s1, skillPos1, skillPos2, debuffsReceived1);
    cleanupActiveSkills(s2, skillPos2, skillPos1, debuffsReceived2);

    data.sk[runnerAIndex] = snapshotSkillData(skillPos1);
    data.sk[runnerBIndex] = snapshotSkillData(skillPos2);
    skillPos1.clear();
    skillPos2.clear();

    // Store debuffs received by each runner
    data.debuffsReceived[runnerAIndex] = snapshotSkillData(debuffsReceived1);
    data.debuffsReceived[runnerBIndex] = snapshotSkillData(debuffsReceived2);
    debuffsReceived1.clear();
    debuffsReceived2.clear();

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
    if (s1.hpDied) {
      s1Stats.hpDiedCount++;
    }
    if (s1.fullSpurt) {
      s1Stats.fullSpurtCount++;
    }

    // Track stats for s2's uma
    const s2Stats = s2IsUma1 ? staminaStats.uma1 : staminaStats.uma2;
    s2Stats.total++;
    if (s2.hpDied) {
      s2Stats.hpDiedCount++;
    }
    if (s2.fullSpurt) {
      s2Stats.fullSpurtCount++;
    }

    const s1FirstUmaStats = s1IsUma1 ? firstUmaStats.uma1 : firstUmaStats.uma2;
    s1FirstUmaStats.total++;
    if (s1.firstUmaInLateRace) {
      s1FirstUmaStats.firstPlaceCount++;
    }

    const s2FirstUmaStats = s2IsUma1 ? firstUmaStats.uma1 : firstUmaStats.uma2;
    s2FirstUmaStats.total++;
    if (s2.firstUmaInLateRace) {
      s2FirstUmaStats.firstPlaceCount++;
    }

    // Cleanup AFTER stat tracking
    s2.cleanup();
    s1.cleanup();

    // Collect rushed statistics (also based on which uma the solver represents)
    if (s1.rushedActivations.length > 0) {
      const [start, end] = s1.rushedActivations[0];
      const length = end - start;
      const s1RushedStats = s1IsUma1 ? rushedStats.uma1 : rushedStats.uma2;
      s1RushedStats.lengths.push(length);
      s1RushedStats.count++;
    }
    if (s2.rushedActivations.length > 0) {
      const [start, end] = s2.rushedActivations[0];
      const length = end - start;
      const s2RushedStats = s2IsUma1 ? rushedStats.uma1 : rushedStats.uma2;
      s2RushedStats.lengths.push(length);
      s2RushedStats.count++;
    }

    if (s1.leadCompetitionStart != null) {
      const start = s1.leadCompetitionStart;
      const end =
        s1.leadCompetitionEnd != null ? s1.leadCompetitionEnd : course.distance;
      const length = end - start;
      const s1LeadCompStats = s1IsUma1
        ? leadCompetitionStats.uma1
        : leadCompetitionStats.uma2;
      s1LeadCompStats.lengths.push(length);
      s1LeadCompStats.count++;
    }
    if (s2.leadCompetitionStart != null) {
      const start = s2.leadCompetitionStart;
      const end =
        s2.leadCompetitionEnd != null ? s2.leadCompetitionEnd : course.distance;
      const length = end - start;
      const s2LeadCompStats = s2IsUma1
        ? leadCompetitionStats.uma1
        : leadCompetitionStats.uma2;
      s2LeadCompStats.lengths.push(length);
      s2LeadCompStats.count++;
    }

    const basinn = (sign * posDifference) / 2.5;
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

      estMedian =
        mid > 0 && diff.length % 2 == 0
          ? (diff[mid - 1] + diff[mid]) / 2
          : diff[mid];
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
  const calculateStats = (stats: { lengths: number[]; count: number }) => {
    if (stats.lengths.length === 0) {
      return { min: 0, max: 0, mean: 0, frequency: 0 };
    }

    const min = Math.min(...stats.lengths);
    const max = Math.max(...stats.lengths);
    const mean =
      stats.lengths.reduce((a, b) => a + b, 0) / stats.lengths.length;

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
          ? ((staminaStats.uma1.total - staminaStats.uma1.hpDiedCount) /
              staminaStats.uma1.total) *
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
          ? ((staminaStats.uma2.total - staminaStats.uma2.hpDiedCount) /
              staminaStats.uma2.total) *
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
          ? (firstUmaStats.uma1.firstPlaceCount / firstUmaStats.uma1.total) *
            100
          : 0,
    },
    uma2: {
      firstPlaceRate:
        firstUmaStats.uma2.total > 0
          ? (firstUmaStats.uma2.firstPlaceCount / firstUmaStats.uma2.total) *
            100
          : 0,
    },
  };

  // Each run (min, max, mean, median) already has its own rushed data from its actual simulation
  // We don't need to overwrite it - just ensure the rushed field is properly formatted
  // The rushed data comes from the RaceSolver.rushedActivations collected during each specific run

  if (!includeRunData) {
    return {
      results: diff,
      // @ts-expect-error - null is not assignable to type SimulationData when includeRunData is false
      runData: null,
      rushedStats: rushedStatsSummary,
      leadCompetitionStats: leadCompetitionStatsSummary,
      // spurtInfo: options.useEnhancedSpurt ? { uma1: {}, uma2: {} } : null,
      spurtInfo: null,
      staminaStats: staminaStatsSummary,
      firstUmaStats: firstUmaStatsSummary,
    };
  }

  return {
    results: diff,
    runData: { minrun, maxrun, meanrun, medianrun },
    rushedStats: rushedStatsSummary,
    leadCompetitionStats: leadCompetitionStatsSummary,
    // spurtInfo: options.useEnhancedSpurt ? { uma1: {}, uma2: {} } : null,
    spurtInfo: null,
    staminaStats: staminaStatsSummary,
    firstUmaStats: firstUmaStatsSummary,
  };
}

export const run1Round = (params: Run1RoundParams) => {
  const { nsamples, skills, course, racedef, uma, pacer, options } = params;

  const data: SkillBasinResponse = new Map();

  skills.forEach((id) => {
    const withSkill = { ...uma, skills: [...uma.skills, id] };

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
    const median =
      results.length % 2 == 0
        ? (results[mid - 1] + results[mid]) / 2
        : results[mid];

    const mean = results.reduce((a, b) => a + b, 0) / results.length;

    data.set(id, {
      id,
      results,
      runData,
      min: results[0],
      max: results[results.length - 1],
      mean,
      median,
    });
  });

  return data;
};

function snapshotSkillData(
  skillMap: Map<string, [number, number][]>,
): Map<string, [number, number][]> {
  return new Map(
    Array.from(skillMap.entries()).map(([key, value]) => [
      key,
      value.map((tuple) => [...tuple] as [number, number]),
    ]),
  );
}
