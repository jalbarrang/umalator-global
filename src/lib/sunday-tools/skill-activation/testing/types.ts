/**
 * Activation Testing Types
 *
 * Types for the differential testing harness that compares
 * the new activation engine against the legacy engine.
 *
 * The harness runs both engines on identical inputs and compares
 * their activation schedules, timing, and outcomes to validate
 * correctness before the migration switchover.
 */

import type { Region } from '../../shared/region';
import type { ActivationEvent } from '../runtime/types';
import type { ActivationDiagnostic, SkillActivationPlan } from '../compiled/types';

// ============================================================
// Test Fixture
// ============================================================

/**
 * A complete test scenario for comparing legacy vs new engine behavior.
 */
export type ActivationTestFixture = {
  /** Human-readable name for the test case. */
  readonly name: string;
  /** Skill IDs to test. */
  readonly skillIds: ReadonlyArray<string>;
  /** Course ID to use. */
  readonly courseId: number;
  /** Runner configuration. */
  readonly runnerConfig: TestRunnerConfig;
  /** Race parameters. */
  readonly raceConfig: TestRaceConfig;
  /** Number of simulation samples to run. */
  readonly nsamples: number;
  /** Optional forced positions for specific skills. */
  readonly forcedPositions?: Readonly<Record<string, number>>;
  /** Optional seed for deterministic comparison. */
  readonly seed?: number;
};

export type TestRunnerConfig = {
  readonly strategy: number;
  readonly mood: number;
  readonly stats: {
    readonly speed: number;
    readonly stamina: number;
    readonly power: number;
    readonly guts: number;
    readonly wit: number;
  };
  readonly aptitudes: {
    readonly distance: number;
    readonly strategy: number;
    readonly surface: number;
  };
};

export type TestRaceConfig = {
  readonly ground: number;
  readonly weather: number;
  readonly season: number;
  readonly timeOfDay: number;
  readonly grade: number;
};

// ============================================================
// Legacy Engine Snapshot
// ============================================================

/**
 * Snapshot of legacy engine state for one simulation round.
 * Captures the pending skill schedule and activation outcomes
 * in the format the old engine produces.
 */
export type LegacyEngineSnapshot = {
  /** Pending skills as placed by the old engine. */
  readonly pendingSkills: ReadonlyArray<LegacyPendingSkillSnapshot>;
  /** Skills that activated during the round. */
  readonly activatedSkills: ReadonlyArray<LegacyActivationSnapshot>;
  /** Skills that failed to activate (wit check, expired, etc.). */
  readonly failedSkills: ReadonlyArray<LegacyFailureSnapshot>;
};

export type LegacyPendingSkillSnapshot = {
  readonly skillId: string;
  readonly triggerRegion: Region;
  readonly hasExtraCondition: boolean;
};

export type LegacyActivationSnapshot = {
  readonly skillId: string;
  readonly activationPosition: number;
  readonly triggerRegion: Region;
};

export type LegacyFailureSnapshot = {
  readonly skillId: string;
  readonly reason: 'wit_check_failed' | 'window_expired' | 'condition_false';
  readonly triggerRegion: Region;
};

// ============================================================
// New Engine Snapshot
// ============================================================

/**
 * Snapshot of new engine state for one simulation round.
 */
export type NewEngineSnapshot = {
  /** Compiled plans produced by the compiler. */
  readonly plans: ReadonlyArray<SkillActivationPlan>;
  /** Activation events that occurred during the round. */
  readonly activationEvents: ReadonlyArray<ActivationEvent>;
  /** Diagnostics from compilation. */
  readonly diagnostics: ReadonlyArray<ActivationDiagnostic>;
};

// ============================================================
// Comparison Result
// ============================================================

/**
 * Result of comparing legacy vs new engine for one simulation round.
 */
export type ComparisonResult = {
  /** Whether the two engines produced equivalent outcomes. */
  readonly equivalent: boolean;
  /** Detailed differences found. */
  readonly differences: ReadonlyArray<ComparisonDifference>;
  /** Metrics for this comparison. */
  readonly metrics: ComparisonMetrics;
};

export type ComparisonDifference = {
  readonly skillId: string;
  readonly field: string;
  readonly legacy: string;
  readonly newEngine: string;
  readonly severity: 'expected_improvement' | 'regression' | 'behavioral_change';
  /** Human-readable explanation. */
  readonly description: string;
};

export type ComparisonMetrics = {
  /** Number of skills compared. */
  readonly skillCount: number;
  /** Number of skills with matching activation outcomes. */
  readonly matchCount: number;
  /** Number of skills with different outcomes. */
  readonly differenceCount: number;
  /** Number of differences classified as expected improvements. */
  readonly expectedImprovementCount: number;
  /** Number of differences classified as regressions. */
  readonly regressionCount: number;
};

// ============================================================
// Test Harness Interface
// ============================================================

/**
 * The differential testing harness.
 * Runs both engines on the same fixture and produces comparison results.
 */
export type DifferentialTestHarness = {
  /**
   * Run a single fixture through both engines and compare.
   */
  compare: (fixture: ActivationTestFixture) => ComparisonResult;

  /**
   * Run a curated matrix of fixtures for regression coverage.
   */
  runRegressionSuite: (
    fixtures: ReadonlyArray<ActivationTestFixture>,
  ) => RegressionSuiteResult;
};

export type RegressionSuiteResult = {
  readonly totalFixtures: number;
  readonly passedFixtures: number;
  readonly failedFixtures: number;
  readonly results: ReadonlyArray<{
    readonly fixture: ActivationTestFixture;
    readonly result: ComparisonResult;
  }>;
};
