import type { RoundResult, SkillComparisonRoundResult } from '@/modules/simulation/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from '@/modules/simulation/lib/course/definitions';
import type { RaceParameters } from '@/modules/simulation/lib/definitions';
import { buildBaseStats, buildSkillData } from '@/modules/simulation/lib/core/RaceSolverBuilder';
import { Region, RegionList } from '@/modules/simulation/lib/utils/Region';
import { SkillPerspective } from '@/modules/simulation/lib/skills/definitions';
import { PosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import { createParser } from '@/modules/simulation/lib/skills/parser/ConditionParser';

/**
 * Gets the skills that are activateable for a given horse, course, and race definition.
 *
 * This is useful for filtering out early the skills that don't trigger during the race.
 *
 * @param skills - The skills to check.
 * @param runner - The runner to use.
 * @param course - The course to use.
 * @param raceParams - The race parameters to use.
 *
 * @returns The skills that are activateable.
 */
export function getActivateableSkills(
  skills: Array<string>,
  runner: RunnerState,
  course: CourseData,
  raceParams: RaceParameters,
) {
  const parser = createParser();
  const runnerB = buildBaseStats(runner);

  const wholeCourse = new RegionList();
  wholeCourse.push(new Region(0, course.distance));

  const activableSkills = [];

  for (const skillId of skills) {
    const skillTriggers = buildSkillData(
      runnerB,
      raceParams,
      course,
      wholeCourse,
      parser,
      skillId,
      SkillPerspective.Any,
    );

    const isActivable = skillTriggers.some(
      (trigger) => trigger.regions.length > 0 && trigger.regions[0].start < 9999,
    );

    if (isActivable) {
      activableSkills.push(skillId);
    }
  }

  return activableSkills;
}

export function getNullRow(skillid: string): RoundResult {
  return {
    id: skillid,
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    results: [],
    runData: undefined,
  };
}

export function getNullSkillComparisonRow(skillid: string): SkillComparisonRoundResult {
  return {
    id: skillid,
    skillActivations: {},
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    results: [],
    runData: {
      minrun: {
        sk: [{}, {}],
      },
      maxrun: {
        sk: [{}, {}],
      },
      meanrun: {
        sk: [{}, {}],
      },
      medianrun: {
        sk: [{}, {}],
      },
    },
    filterReason: undefined,
  };
}

export const defaultSimulationOptions = {
  posKeepMode: PosKeepMode.Approximate,
  allowRushedUma1: false,
  allowRushedUma2: false,
  allowDownhillUma1: false,
  allowDownhillUma2: false,
  allowSectionModifierUma1: false,
  allowSectionModifierUma2: false,
  useEnhancedSpurt: false,
  accuracyMode: false,
  skillCheckChanceUma1: false,
  skillCheckChanceUma2: false,
  pacemakerCount: 1,
};
