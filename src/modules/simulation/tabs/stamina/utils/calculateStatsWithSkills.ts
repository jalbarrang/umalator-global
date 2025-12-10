import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import { getSkillDataById } from '@/modules/skills/utils';
import { GroundCondition } from '@simulation/lib/RaceParameters';
import {
  BaseStats,
  buildAdjustedStats,
  buildBaseStats,
} from '@simulation/lib/RaceSolverBuilder';

// Skill effect types from race mechanics
const SkillEffectType = {
  SpeedUp: 1,
  StaminaUp: 2,
  PowerUp: 3,
  GutsUp: 4,
  WisdomUp: 5,
} as const;

export interface GreenSkillModifiers {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
}

export interface StatsWithSkillsResult {
  baseStats: BaseStats;
  adjustedStats: BaseStats;
  greenSkillModifiers: GreenSkillModifiers;
}

/**
 * Parse green skill modifiers from a list of skill IDs
 * Green skills have effect types 1-5 (Speed, Stamina, Power, Guts, Wisdom)
 * Both positive (buffs) and negative (debuffs) modifiers are summed
 */
export function parseGreenSkillModifiers(
  skillIds: string[],
): GreenSkillModifiers {
  const modifiers: GreenSkillModifiers = {
    speed: 0,
    stamina: 0,
    power: 0,
    guts: 0,
    wisdom: 0,
  };

  for (const skillId of skillIds) {
    const skillData = getSkillDataById(skillId);
    if (!skillData) continue;

    // Process all alternatives - green skills typically only have one but we should handle all
    for (const alt of skillData.alternatives) {
      for (const effect of alt.effects) {
        // Effect modifiers are stored divided by 10000 in the data
        const modifier = effect.modifier / 10000;

        switch (effect.type) {
          case SkillEffectType.SpeedUp:
            modifiers.speed += modifier;
            break;
          case SkillEffectType.StaminaUp:
            modifiers.stamina += modifier;
            break;
          case SkillEffectType.PowerUp:
            modifiers.power += modifier;
            break;
          case SkillEffectType.GutsUp:
            modifiers.guts += modifier;
            break;
          case SkillEffectType.WisdomUp:
            modifiers.wisdom += modifier;
            break;
        }
      }
    }
  }

  return modifiers;
}

/**
 * Clamp a stat value to the valid range (1-2000) as per race mechanics
 */
function clampStat(value: number): number {
  return Math.max(1, Math.min(2000, value));
}

/**
 * Calculate final stats with green skills applied
 * Follows the race initialization order from race-mechanics.md:
 * 1. Build base stats (raw stats + motivation)
 * 2. Apply green skill modifiers to base stats (with clamping 1-2000)
 * 3. Call buildAdjustedStats to get final adjusted stats
 */
export function calculateStatsWithSkills(
  runner: RunnerState,
  courseId: number,
  groundCondition: GroundCondition,
): StatsWithSkillsResult {
  // 1. Build base stats (applies motivation coefficient)
  const baseStats = buildBaseStats({
    speed: runner.speed,
    stamina: runner.stamina,
    power: runner.power,
    guts: runner.guts,
    wisdom: runner.wisdom,
    strategy: runner.strategy,
    distanceAptitude: runner.distanceAptitude,
    surfaceAptitude: runner.surfaceAptitude,
    strategyAptitude: runner.strategyAptitude,
    mood: runner.mood,
  });

  // 2. Parse green skills (effect types 1-5) - includes both buffs and debuffs
  const greenSkillModifiers = parseGreenSkillModifiers(runner.skills);

  // 3. Apply green skills to base stats (with clamping)
  const statsWithGreens: BaseStats = {
    ...baseStats,
    speed: clampStat(baseStats.speed + greenSkillModifiers.speed),
    stamina: clampStat(baseStats.stamina + greenSkillModifiers.stamina),
    power: clampStat(baseStats.power + greenSkillModifiers.power),
    guts: clampStat(baseStats.guts + greenSkillModifiers.guts),
    wisdom: clampStat(baseStats.wisdom + greenSkillModifiers.wisdom),
    rawStamina: Math.max(1, baseStats.rawStamina + greenSkillModifiers.stamina),
  };

  const course = CourseHelpers.getCourse(courseId);

  // 4. Get adjusted stats (applies ground/course modifiers, strategy proficiency, etc.)
  const adjustedStats = buildAdjustedStats(
    statsWithGreens,
    course,
    groundCondition,
  );

  return {
    baseStats,
    adjustedStats,
    greenSkillModifiers,
  };
}
