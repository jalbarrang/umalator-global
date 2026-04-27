/**
 * Activation Compiler Types
 *
 * Types for the compilation pipeline that transforms raw skill data
 * into compiled activation plans.
 *
 * The compiler pipeline has three stages:
 * 1. Parse — condition strings become an AST / operator tree
 * 2. Compile — AST becomes structured ActivationOpportunities with branch-local semantics
 * 3. Optimize — optional stripping of provenance for lean runtime plans
 *
 * The compiler is pure: no RNG, no runtime state, no mutation.
 * Course data and runner eval state are inputs for static region resolution.
 */

import type { CourseData } from '../../course/definitions';
import type { RegionList } from '../../shared/region';
import type { SkillEvalRunner } from '../../skills/parser/definitions';
import type { RaceParameters } from '../../common/race';
import type {
  ActivationDiagnostic,
  ActivationOpportunity,
  CooldownPolicy,
  ExclusiveOpportunitySet,
  NormalizedActivationRarity,
  PlanEntry,
  SkillActivationPlan,
} from '../compiled/types';
import type { RawSkillRecord } from '../raw/types';

// ============================================================
// Compiler Options
// ============================================================

/**
 * Controls how the compiler handles unsupported mechanics.
 * - strict: unsupported conditions/effects produce errors and throw
 * - lenient: unsupported conditions/effects produce diagnostics and skip
 */
export type CompilationMode = 'strict' | 'lenient';

/**
 * Full compilation context provided to the compiler.
 * Contains everything needed to resolve static conditions,
 * derive cooldown scaling, and produce a complete plan.
 */
export type CompilationContext = {
  readonly course: CourseData;
  readonly wholeCourse: RegionList;
  readonly runner: SkillEvalRunner;
  readonly raceParams: RaceParameters;
  readonly mode: CompilationMode;
  /** Course distance in meters, used for cooldown/duration scaling. */
  readonly courseDistanceMeters: number;
};

// ============================================================
// Compiler Output
// ============================================================

/**
 * The result of compiling a single raw skill record.
 * Contains the plan plus any diagnostics that didn't cause a throw.
 */
export type CompilationResult<TRunnerState = unknown> = {
  readonly plan: SkillActivationPlan<TRunnerState>;
  readonly diagnostics: ReadonlyArray<ActivationDiagnostic>;
  /**
   * Whether the plan is fully supported.
   * False when lenient mode skipped unsupported opportunities.
   */
  readonly isFullySupported: boolean;
};

// ============================================================
// Branch Compilation IR
// ============================================================

/**
 * Intermediate representation for a single parsed condition branch
 * before it is assembled into an opportunity.
 *
 * This is the key type that replaces the legacy [RegionList, DynamicCondition]
 * output. It preserves branch-local windows, predicates, and sampling policy
 * so the compiler can assemble opportunities and exclusive sets correctly.
 */
export type CompiledBranch<TRunnerState = unknown> = {
  /** Static trigger windows resolved from the condition. */
  readonly windows: RegionList;
  /** Branch-local runtime predicate (replaces the old DynamicCondition). */
  readonly predicate: BranchPredicate<TRunnerState>;
  /** Sampling policy derived from condition primitives. */
  readonly samplingPolicyKind: SamplingPolicyKindResolution;
  /** Raw condition string for provenance. */
  readonly conditionSource: string;
};

/**
 * The predicate result from branch compilation.
 * Equivalent to the old DynamicCondition but with phase metadata.
 */
export type BranchPredicate<TRunnerState = unknown> = {
  readonly isAlwaysTrue: boolean;
  readonly evaluate: (state: TRunnerState) => boolean;
  readonly source: string;
};

/**
 * Result of resolving which sampling policy applies to a branch.
 * Tracks the source condition primitive for diagnostics.
 */
export type SamplingPolicyKindResolution = {
  readonly kind: import('../compiled/types').SamplingPolicyKind;
  readonly sourceCondition: string | null;
};

// ============================================================
// Alternative Compilation IR
// ============================================================

/**
 * The result of compiling one skill alternative before plan assembly.
 * An alternative may produce one or more opportunities (via `@` branches).
 */
export type CompiledAlternative<TRunnerState = unknown> = {
  readonly alternativeIndex: number;
  /**
   * If the condition contains `@`, this is an exclusive set of branches.
   * Otherwise, it's a single entry.
   */
  readonly entry: PlanEntry<TRunnerState>;
  /** Static precondition evaluation result. */
  readonly preconditionResult: PreconditionResult;
  /** Diagnostics from this alternative's compilation. */
  readonly diagnostics: ReadonlyArray<ActivationDiagnostic>;
};

/**
 * Result of evaluating a static precondition at compile time.
 */
export type PreconditionResult =
  | { readonly kind: 'passed' }
  | { readonly kind: 'failed'; readonly reason: string }
  | { readonly kind: 'none' };

// ============================================================
// Rarity Normalization
// ============================================================

/**
 * Maps raw DB rarity to the normalized activation rarity bucket.
 */
export type RarityNormalizationRule = {
  readonly rawRarity: number;
  readonly normalized: NormalizedActivationRarity;
};

// ============================================================
// Cooldown Compilation
// ============================================================

/**
 * Input for cooldown policy compilation.
 * The compiler derives a plan-level cooldown from one or more
 * alternative-level base cooldown values.
 */
export type CooldownCompilationInput = {
  /** Raw base cooldown values from each alternative (in DB units). */
  readonly baseCooldowns: ReadonlyArray<number>;
  /** Course distance for scaling. */
  readonly courseDistanceMeters: number;
};

// ============================================================
// Compiler Interface
// ============================================================

/**
 * The activation compiler interface.
 * Transforms raw skill records into compiled activation plans.
 */
export type ActivationCompiler<TRunnerState = unknown> = {
  /**
   * Compile a single raw skill record into an activation plan.
   */
  compile: (
    skill: RawSkillRecord,
    context: CompilationContext,
  ) => CompilationResult<TRunnerState>;

  /**
   * Compile multiple raw skill records.
   * Returns plans in the same order as input.
   */
  compileMany: (
    skills: ReadonlyArray<RawSkillRecord>,
    context: CompilationContext,
  ) => ReadonlyArray<CompilationResult<TRunnerState>>;
};
