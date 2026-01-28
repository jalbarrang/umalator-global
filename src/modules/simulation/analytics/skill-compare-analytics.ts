/**
 * Enhanced Skill Comparison with Analytics
 *
 * This is an experimental version of skill-compare.ts that collects
 * comprehensive activation analytics across all samples.
 */

import { ActivationCollector } from './collector';
import type { RunComparisonParams } from '@/modules/simulation/types';
import type { SkillActivation } from '@/modules/simulation/compare.types';
import type { RaceSolver } from '@/modules/simulation/lib/core/RaceSolver';
import type { ActivationRecord, AnalyticsOptions, SkillAnalyticsResult } from './types';
import type {
  ISkillPerspective,
  ISkillTarget,
  ISkillType,
} from '@/modules/simulation/lib/skills/definitions';
import {
  RaceSolverBuilder,
  buildAdjustedStats,
  buildBaseStats,
} from '@/modules/simulation/lib/core/RaceSolverBuilder';
import { PosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import {
  SkillPerspective,
  SkillTarget,
  SkillType,
} from '@/modules/simulation/lib/skills/definitions';
import { getSkillMetaById } from '@/modules/skills/utils';

export interface SkillComparisonWithAnalyticsResult {
  results: Array<number>;
  min: number;
  max: number;
  mean: number;
  median: number;
  skillAnalytics: SkillAnalyticsResult;
}

export function runComparisonWithAnalytics(
  params: RunComparisonParams,
  skillId: string,
  analyticsOptions: AnalyticsOptions = {
    includeRepresentativeRuns: true,
    binSize: 10,
    trackCorrelation: true,
  },
): SkillComparisonWithAnalyticsResult {
  const { nsamples, course, racedef, runnerA, runnerB, options } = params;

  const seed = options.seed ?? 0;
  const posKeepMode = options.posKeepMode ?? PosKeepMode.None;
  const mode = options.mode ?? 'compare';
  const numUmas = racedef.numUmas ?? 1;

  // Initialize analytics collector
  const collector = new ActivationCollector(course.distance, analyticsOptions.binSize);

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

  const runnerBRaceSolver = runnerARaceSolver.fork();

  if (options.mode === 'compare') {
    runnerARaceSolver.desync();
  }

  runnerARaceSolver.horse(runnerA);
  runnerBRaceSolver.horse(runnerB);

  // ## Settings to disable for this skill comparison analysis
  // ### Disable Rushed status
  runnerARaceSolver.disableRushed();
  runnerBRaceSolver.disableRushed();
  // ### Disable Downhill checks
  runnerARaceSolver.disableDownhill();
  runnerBRaceSolver.disableDownhill();
  // ### Disable Section Modifier checks
  runnerARaceSolver.disableSectionModifier();
  runnerBRaceSolver.disableSectionModifier();
  // ### Disable Skill Check Chance (Skills will always activate when conditions are met)
  runnerARaceSolver.skillCheckChance(false);
  runnerBRaceSolver.skillCheckChance(false);

  // Sort skills by group
  const commonSkillsArray = [...runnerA.skills, ...runnerB.skills].toSorted((a, b) => +a - +b);
  const commonSkills = Array.from(new Set(commonSkillsArray));

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
      return commonSkills.length;
    }
  };

  const skillSorterByGroup = (a: string, b: string) => {
    const groupIndexA = getCommonGroupIndex(a);
    const groupIndexB = getCommonGroupIndex(b);
    if (groupIndexA !== groupIndexB) {
      return groupIndexA - groupIndexB;
    }
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

  // Add skills
  const runnerASortedSkills = runnerA.skills.toSorted(skillSorterByGroup);
  for (const id of runnerASortedSkills) {
    const skillIdClean = id.split('-')[0];
    const forcedPos = runnerA.forcedSkillPositions[id];
    if (forcedPos) {
      runnerARaceSolver.addSkillAtPosition(skillIdClean, forcedPos, SkillPerspective.Self);
      runnerBRaceSolver.addSkill(skillIdClean, SkillPerspective.Other, undefined, runnerAWit);
    } else {
      runnerARaceSolver.addSkill(skillIdClean, SkillPerspective.Self);
      runnerBRaceSolver.addSkill(skillIdClean, SkillPerspective.Other, undefined, runnerAWit);
    }
  }

  const runnerBSortedSkills = runnerB.skills.toSorted(skillSorterByGroup);
  for (const id of runnerBSortedSkills) {
    const skillIdClean = id.split('-')[0];
    const forcedPos = runnerB.forcedSkillPositions[id];
    if (forcedPos != null) {
      runnerBRaceSolver.addSkillAtPosition(skillIdClean, forcedPos, SkillPerspective.Self);
      runnerARaceSolver.addSkill(skillIdClean, SkillPerspective.Other, undefined, runnerBWit);
    } else {
      runnerBRaceSolver.addSkill(skillIdClean, SkillPerspective.Self);
      runnerARaceSolver.addSkill(skillIdClean, SkillPerspective.Other, undefined, runnerBWit);
    }
  }

  // Activation tracking
  const runnerBSkillActivations: Map<string, Array<SkillActivation>> = new Map();

  const getActivator = (skillsSet: Map<string, Array<SkillActivation>>) => {
    return (
      _raceSolver: RaceSolver,
      currentPosition: number,
      executionId: string,
      skillIdParam: string,
      perspective: number,
      effectType: number,
      effectTarget: number,
    ) => {
      if (['asitame', 'staminasyoubu'].includes(skillIdParam)) return;
      if (effectTarget === SkillTarget.Self) {
        const skillSetValue = skillsSet.get(executionId) ?? [];
        skillSetValue.push({
          executionId,
          skillId: skillIdParam,
          start: currentPosition,
          end: currentPosition,
          perspective: perspective as ISkillPerspective,
          effectType: effectType as ISkillType,
          effectTarget: effectTarget as ISkillTarget,
        });
        skillsSet.set(executionId, skillSetValue);
      }
    };
  };

  const getDeactivator = (skillsSet: Map<string, Array<SkillActivation>>) => {
    return (
      _raceSolver: RaceSolver,
      currentPosition: number,
      executionId: string,
      _skillIdParam: string,
      _perspective: number,
      _effectType: number,
      _effectTarget: number,
    ) => {
      const skillActivations = skillsSet.get(executionId) ?? [];
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

  runnerBRaceSolver.onSkillActivate(getActivator(runnerBSkillActivations));
  runnerBRaceSolver.onSkillDeactivate(getDeactivator(runnerBSkillActivations));

  const a = runnerARaceSolver.build();
  const b = runnerBRaceSolver.build();

  const sign = 1;
  const diff: Array<number> = [];

  // Run all samples
  for (let i = 0; i < nsamples; ++i) {
    const solverA = a.next(false).value as RaceSolver;
    const solverB = b.next(false).value as RaceSolver;

    solverA.initUmas([solverB]);
    solverB.initUmas([solverA]);

    let solverAFinished = false;
    let solverBFinished = false;
    let positionDiff = 0;

    while (!solverAFinished || !solverBFinished) {
      if (solverB.pos < course.distance) {
        solverB.step(1 / 15);
      } else if (!solverBFinished) {
        solverBFinished = true;
        if (!solverAFinished) {
          positionDiff = solverB.pos - solverA.pos;
        }
      }

      if (solverA.pos < course.distance) {
        solverA.step(1 / 15);
      } else if (!solverAFinished) {
        solverAFinished = true;
        if (!solverBFinished) {
          positionDiff = solverA.pos - solverB.pos;
        }
      }
    }

    // Collect activation data for this sample
    const activationsForSkill: Array<ActivationRecord> = [];
    runnerBSkillActivations.forEach((activations, execId) => {
      // Only track the skill we're analyzing
      if (execId.startsWith(`${skillId}-`)) {
        activations.forEach((act) => {
          activationsForSkill.push({
            start: act.start,
            end: act.end,
            effectType: act.effectType,
          });
        });
      }
    });

    const basinn = (sign * positionDiff) / 2.5;
    diff.push(basinn);

    // Record sample data in collector
    collector.recordSample(i, activationsForSkill, basinn);

    // Clear for next sample
    runnerBSkillActivations.clear();

    solverB.cleanup();
    solverA.cleanup();
  }

  // Calculate statistics
  diff.sort((a, b) => a - b);

  const mid = Math.floor(diff.length / 2);
  const median = diff.length % 2 == 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
  const mean = diff.reduce((a, b) => a + b) / diff.length;

  // Generate final analytics
  const activationAnalytics = collector.generateAnalytics();

  const skillAnalytics: SkillAnalyticsResult = {
    skillId,
    results: diff,
    min: diff[0],
    max: diff[diff.length - 1],
    mean,
    median,
    activationAnalytics,
  };

  return {
    results: diff,
    min: diff[0],
    max: diff[diff.length - 1],
    mean,
    median,
    skillAnalytics,
  };
}
