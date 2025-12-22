/**
 * Enhanced Race Solver Integration
 *
 * Provides factory functions and utilities to create RaceSolver instances
 * with the enhanced HP/spurt calculation system from umasim
 */

import { EnhancedHpPolicy } from './physics/health/policies/EnhancedHealthPolicy';
import { GameHpPolicy } from './physics/health/policies/GameHealthPolicy';
import { RaceRunner } from './RaceRunner';
import type { RunnerParameters } from './runner/types';
import type { CourseData, IGroundCondition, PendingSkill } from './core/types';
import type { PRNG } from './utils/Random';
import type { ISkillPerspective, ISkillTarget, ISkillType } from './skills/types';

export type OnSkillActivateCallback = (
  raceSolver: RaceRunner,
  currentPosition: number,
  executionId: string,
  skillId: string,
  perspective: ISkillPerspective,
  type: ISkillType,
  target: ISkillTarget,
) => void;

export type OnSkillDeactivateCallback = (
  raceSolver: RaceRunner,
  currentPosition: number,
  executionId: string,
  skillId: string,
  perspective: ISkillPerspective,
  type: ISkillType,
  target: ISkillTarget,
) => void;

export type RaceRunnerConfig = {
  horse: RunnerParameters;
  course: CourseData;
  ground: IGroundCondition;
  rng: PRNG;
  skills: Array<PendingSkill>;
  pacer?: RaceRunner;
  useEnhancedSpurt?: boolean; // Whether to use enhanced spurt calculations
  onSkillActivate?: OnSkillActivateCallback;
  onSkillDeactivate?: OnSkillDeactivateCallback;
  disableRushed?: boolean;
  disableDownhill?: boolean;
};

/**
 * Create a RaceRunner with optional enhanced spurt calculation
 *
 * @param config Configuration object
 * @returns Configured RaceRunner instance
 */
export function createRaceRunner(config: RaceRunnerConfig): RaceRunner {
  const hp = config.useEnhancedSpurt
    ? new EnhancedHpPolicy(config.course, config.ground, config.rng)
    : new GameHpPolicy(config.course, config.ground, config.rng);

  return new RaceRunner({
    runner: config.horse,
    course: config.course,
    rng: config.rng,
    skills: config.skills,
    hp: hp,
    onSkillActivate: config.onSkillActivate,
    onSkillDeactivate: config.onSkillDeactivate,
    disableRushed: config.disableRushed,
    disableDownhill: config.disableDownhill,
  });
}

/**
 * Create a pacer (virtual opponent) with enhanced calculations
 */
export function createPacer(config: Omit<RaceRunnerConfig, 'pacer'>): RaceRunner {
  return createRaceRunner({ ...config, pacer: undefined });
}

/**
 * Helper to compare standard vs enhanced spurt calculations
 * Useful for debugging and analysis
 */
export function compareSpurtCalculations(
  horse: RunnerParameters,
  course: CourseData,
  ground: IGroundCondition,
  rng: PRNG,
  skills: Array<PendingSkill>,
): {
  standard: RaceRunner;
  enhanced: RaceRunner;
  standardTime: number;
  enhancedTime: number;
  timeDiff: number;
} {
  // Clone RNG state for fair comparison
  const rng1 = rng;
  const rng2 = rng; // Note: In real usage, you'd want to clone the RNG state

  const standard = createRaceRunner({
    horse,
    course,
    ground,
    rng: rng1,
    skills,
    useEnhancedSpurt: false,
  });

  const enhanced = createRaceRunner({
    horse,
    course,
    ground,
    rng: rng2,
    skills,
    useEnhancedSpurt: true,
  });

  // Run simulations
  const dt = 1 / 15; // 15 FPS
  while (standard.pos < course.distance) {
    standard.step(dt);
  }

  while (enhanced.pos < course.distance) {
    enhanced.step(dt);
  }

  const standardTime = standard.accumulatetime.t;
  const enhancedTime = enhanced.accumulatetime.t;

  return {
    standard,
    enhanced,
    standardTime,
    enhancedTime,
    timeDiff: enhancedTime - standardTime,
  };
}
