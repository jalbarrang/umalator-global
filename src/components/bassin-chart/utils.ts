import { getDefaultParser } from '@simulation/lib/ConditionParser';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { SkillPerspective } from '@simulation/lib/race-solver/types';
import {
  buildBaseStats,
  buildSkillData,
} from '@simulation/lib/RaceSolverBuilder';
import { Region, RegionList } from '@simulation/lib/Region';
import type { RaceParameters } from '@simulation/lib/RaceParameters';
import type { RoundResult } from '@/modules/simulation/types';
import type { CourseData } from '@/modules/simulation/lib/courses/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';

export function getActivateableSkills(
  skills: Array<string>,
  horse: RunnerState,
  course: CourseData,
  racedef: RaceParameters,
) {
  const parser = getDefaultParser();
  const runnerB = buildBaseStats(horse);

  const wholeCourse = new RegionList();
  wholeCourse.push(new Region(0, course.distance));

  const activableSkills = [];

  for (const skillId of skills) {
    const skillTriggers = buildSkillData(
      runnerB,
      racedef,
      course,
      wholeCourse,
      parser,
      skillId,
      SkillPerspective.Any,
    );

    if (
      skillTriggers.some(
        (trigger) =>
          trigger.regions.length > 0 && trigger.regions[0].start < 9999,
      )
    ) {
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
