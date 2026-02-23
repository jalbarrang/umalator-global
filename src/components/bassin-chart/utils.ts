import type { RoundResult, SkillComparisonRoundResult } from '@/modules/simulation/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import { buildSkillData } from '@/lib/sunday-tools/runner/runner.utils';
import { parseStrategyName } from '@/lib/sunday-tools/runner/runner.types';
import { Region, RegionList } from '@/lib/sunday-tools/shared/region';
import { createParser } from '@/lib/sunday-tools/skills/parser/ConditionParser';
import type { SkillEvalRunner } from '@/lib/sunday-tools/skills/parser/definitions';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { buildBaseStats } from '@/lib/sunday-tools/common/runner';

// ===== Shared Chart Utilities =====

// Phase colors matching the RaceTrack visualization
export const PHASE_COLORS = [
  'rgb(0,154,111)', // Early race (green)
  'rgb(242,233,103)', // Mid race (yellow)
  'rgb(209,134,175)', // Late race (light pink)
  'rgb(255,130,130)', // Last spurt (light red)
] as const;

// Standard bin size for position-based charts (in meters)
export const DEFAULT_BIN_SIZE = 10;

// Helper function to determine which phase a position belongs to
export function getPhaseForPosition(position: number, courseDistance: number): number {
  const phase1Start = CourseHelpers.phaseStart(courseDistance, 1);
  const phase2Start = CourseHelpers.phaseStart(courseDistance, 2);
  const phase3Start = CourseHelpers.phaseStart(courseDistance, 3);

  if (position < phase1Start) return 0;
  if (position < phase2Start) return 1;
  if (position < phase3Start) return 2;
  return 3;
}

// Helper to get phase reference lines for charts
export function getPhaseReferenceLines(courseDistance: number) {
  return [
    { position: CourseHelpers.phaseStart(courseDistance, 1), label: 'Mid' },
    { position: CourseHelpers.phaseStart(courseDistance, 2), label: 'Final' },
    { position: CourseHelpers.phaseStart(courseDistance, 3), label: 'Last' },
  ];
}

// Helper to create bins for position-based analysis
export function createDistanceBins<T extends { start: number; end: number }>(
  courseDistance: number,
  binSize: number = DEFAULT_BIN_SIZE,
  initialData: (start: number, end: number, index: number) => T,
): Array<T> {
  const maxDistance = Math.ceil(courseDistance / binSize) * binSize;
  const bins: Array<T> = [];

  for (let i = 0; i < maxDistance; i += binSize) {
    bins.push(initialData(i, i + binSize, bins.length));
  }

  return bins;
}

// ===== End Shared Chart Utilities =====

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
  const baseStats = buildBaseStats(
    {
      speed: runner.speed,
      stamina: runner.stamina,
      power: runner.power,
      guts: runner.guts,
      wit: runner.wisdom,
    },
    runner.mood,
  );
  const skillEvalRunner: SkillEvalRunner = {
    baseStats,
    strategy: parseStrategyName(runner.strategy),
    mood: runner.mood,
  };

  const wholeCourse = new RegionList();
  wholeCourse.push(new Region(0, course.distance));

  const activableSkills = [];

  for (const skillId of skills) {
    const skillTriggers = buildSkillData({
      runner: skillEvalRunner,
      raceParams,
      course,
      wholeCourse,
      parser,
      skillId,
      ignoreNullEffects: false,
    });

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
};
