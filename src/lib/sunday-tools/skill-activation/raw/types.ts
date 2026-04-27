/**
 * Raw Skill Activation Types
 *
 * Types that faithfully mirror extracted DB data before any compilation.
 * These preserve the exact shape of skill_data rows and serve as the
 * input boundary for the activation compiler.
 *
 * Domain terms:
 * - Raw Skill Rarity: exact rarity value from skill_data (1-6)
 * - Activation Lot: raw activate_lot flag (0 = no lottery, 1 = uses wit-check lottery)
 * - Base Cooldown: raw float_cooldown_time before course-distance scaling
 * - Skill Alternative: one candidate branch from a skill's alternatives array
 */

import type { ISkillTarget } from '../../skills/definitions';

// ============================================================
// Raw Effect
// ============================================================

/**
 * A single effect row from skill_data, preserving DB semantics.
 * Value-scaling metadata (valueUsage, valueLevelUsage) is kept raw
 * for the effect-resolution pipeline to interpret.
 */
export type RawEffect = {
  readonly type: number;
  readonly modifier: number;
  readonly target: ISkillTarget;
  readonly valueUsage: number;
  readonly valueLevelUsage: number;
};

// ============================================================
// Raw Skill Alternative
// ============================================================

/**
 * One candidate branch from extracted skill data.
 * Maps directly to condition_N / precondition_N / float_ability_time_N / float_cooldown_time_N
 * columns in skill_data.
 */
export type RawSkillAlternative = {
  /** Raw precondition string, empty string if none. */
  readonly precondition: string;
  /** Raw condition string from skill_data. */
  readonly condition: string;
  /** Raw base duration in DB units (divide by 10000 for seconds). */
  readonly baseDuration: number;
  /** Raw base cooldown in DB units (divide by 10000 for seconds). */
  readonly baseCooldown: number;
  /** Ordered effect rows for this alternative. */
  readonly effects: ReadonlyArray<RawEffect>;
};

// ============================================================
// Raw Skill Entry
// ============================================================

/** Raw rarity values as they appear in skill_data. */
export type RawSkillRarity = 1 | 2 | 3 | 4 | 5 | 6;

/** The subset of raw rarity values that represent unique-family skills. */
export type UniqueFamilyRawRarity = 3 | 4 | 5;

/** Raw activate_lot flag from skill_data. */
export type RawActivationLot = 0 | 1;

/**
 * A complete raw skill record as extracted from skill_data.
 * This is the input to the activation compiler.
 */
export type RawSkillRecord = {
  readonly skillId: string;
  readonly rarity: RawSkillRarity;
  readonly activateLot: RawActivationLot;
  readonly groupId: number;
  readonly alternatives: ReadonlyArray<RawSkillAlternative>;
};
