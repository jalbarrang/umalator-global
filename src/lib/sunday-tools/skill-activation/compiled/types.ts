/**
 * Compiled Activation Plan Types
 *
 * The intermediate representation produced by the activation compiler.
 * These types encode the full activation semantics for a skill:
 * opportunities, trigger windows, predicates, exclusive sets,
 * follow-up topology, cooldown, repeat policies, and attempt policies.
 *
 * All types here are the OUTPUT of compilation and the INPUT to sampling + runtime.
 * They carry no RNG state and no runtime mutation — they are a compiled program
 * that the runtime interprets.
 */

import type { Region, RegionList } from '../../shared/region';
import type { RawEffect, RawSkillAlternative } from '../raw/types';

// ============================================================
// Predicate
// ============================================================

/**
 * When a predicate should be evaluated.
 * - compile: fully resolved at compilation (becomes a static boolean)
 * - runtime: evaluated every frame during simulation
 * - hybrid: partially resolved at compile, remainder evaluated at runtime
 */
export type PredicatePhase = 'compile' | 'runtime' | 'hybrid';

/**
 * A condition with evaluation-phase metadata.
 *
 * The `evaluate` closure receives a runtime state slice and returns boolean.
 * Compile-time predicates are pre-resolved to constant true/false during compilation.
 */
export type Predicate<TRunnerState = unknown> = {
  readonly phase: PredicatePhase;
  readonly evaluate: (state: TRunnerState) => boolean;
  /** Raw condition fragment for diagnostics / provenance. */
  readonly source: string;
};

/**
 * A predicate that is always true. Used as the identity element when
 * no dynamic condition exists for a window or opportunity.
 */
export type TruePredicate<TRunnerState = unknown> = Predicate<TRunnerState> & {
  readonly phase: 'compile';
};

// ============================================================
// Trigger Window
// ============================================================

/**
 * A distance-based interval in which an Activation Opportunity
 * may become eligible to attempt activation.
 *
 * Each window owns its own predicate so that branch-local dynamic
 * conditions stay attached to the geometry they belong to.
 */
export type TriggerWindow<TRunnerState = unknown> = {
  readonly region: Region;
  /**
   * Runtime predicate scoped to this window.
   * If the opportunity-level predicate is true and this window's
   * predicate is also true, the opportunity is eligible.
   */
  readonly predicate: Predicate<TRunnerState>;
};

// ============================================================
// Sampling Policy Descriptor
// ============================================================

/**
 * Identifies which game-mechanic sampling primitive applies to an opportunity.
 *
 * The compiler derives this from condition primitives (corner_random, straight_random, etc.)
 * rather than assigning it arbitrarily. The runtime uses this to dispatch to the correct
 * sampling implementation.
 */
export type SamplingPolicyKind =
  | 'immediate'
  | 'random'
  | 'corner_random'
  | 'straight_random'
  | 'all_corner_random'
  | 'distribution_random'
  | 'fixed_position';

export type SamplingPolicyDescriptor = {
  readonly kind: SamplingPolicyKind;
  /**
   * Distribution parameters when kind is 'distribution_random'.
   * Absent for other kinds.
   */
  readonly distributionParams?: DistributionParams;
  /**
   * Fixed distance when kind is 'fixed_position'.
   */
  readonly fixedPosition?: number;
};

export type DistributionParams =
  | { readonly type: 'uniform' }
  | { readonly type: 'log_normal'; readonly mu: number; readonly sigma: number }
  | { readonly type: 'erlang'; readonly k: number; readonly lambda: number };

// ============================================================
// Effect Payload
// ============================================================

/**
 * The compiled effect-side semantics for what happens when an
 * Activation Opportunity fires.
 *
 * Effect compilation is deliberately separated from activation compilation
 * (ADR-0004). The activation compiler attaches raw effects and the
 * effect-resolution pipeline interprets them at runtime.
 */
export type EffectPayload = {
  /** Raw effects preserved for the effect-resolution pipeline. */
  readonly rawEffects: ReadonlyArray<RawEffect>;
  /** Base duration in seconds (already divided from DB units). */
  readonly baseDurationSeconds: number;
  /**
   * Skill IDs that this effect forces to activate immediately
   * when this opportunity fires (Forced Activation).
   */
  readonly forcedActivationTargets: ReadonlyArray<string>;
  /**
   * Whether this effect registers an Additional Activate watcher
   * that applies a secondary effect while the skill is active.
   */
  readonly hasAdditionalActivate: boolean;
};

// ============================================================
// Attempt Policy
// ============================================================

/**
 * Compiled rule governing whether an Eligible Opportunity must pass
 * a normal activation check (wit check) and whether failure consumes the attempt.
 *
 * Derived from raw activate_lot and normalized rarity during compilation.
 */
export type AttemptPolicy = {
  /** Whether this opportunity requires a wit-based activation check. */
  readonly requiresActivationCheck: boolean;
  /** Whether a failed check still consumes the attempt (prevents retries). */
  readonly failureConsumesAttempt: boolean;
  /** Whether this opportunity bypasses the check entirely (greens, uniques). */
  readonly bypassReason: AttemptBypassReason | null;
};

export type AttemptBypassReason = 'green_skill' | 'unique_skill' | 'no_activation_lot';

// ============================================================
// Normalized Activation Rarity
// ============================================================

/**
 * Runtime rarity bucket after raw rarity normalization.
 * Raw rarities 3, 4, 5 all collapse into 'unique'.
 */
export type NormalizedActivationRarity = 'white' | 'gold' | 'unique' | 'evolution';

// ============================================================
// Repeat Policy
// ============================================================

/**
 * Determines whether a successful activation consumes the target
 * or allows another attempt after cooldown.
 *
 * Resolved hierarchically:
 *   Opportunity > Exclusive Set > Plan > default (one-shot)
 */
export type RepeatPolicy = {
  readonly kind: 'one_shot' | 'repeat_after_cooldown';
};

// ============================================================
// Cooldown Policy
// ============================================================

/**
 * Plan-level cooldown rule.
 * After a successful activation, later opportunities in the same plan
 * are blocked for lockoutDurationSeconds.
 */
export type CooldownPolicy = {
  /** Whether cooldown is active for this plan. */
  readonly enabled: boolean;
  /**
   * Compiled, course-distance-scaled lockout duration in seconds.
   * Null when cooldown is disabled.
   */
  readonly lockoutDurationSeconds: number | null;
};

// ============================================================
// Activation Opportunity
// ============================================================

/**
 * A compiled logical skill branch that may activate.
 * Carries ordered trigger windows, predicates, effects, and policies.
 *
 * An opportunity is the fundamental unit of the activation runtime:
 * the runner walks through its windows in order, evaluates predicates,
 * and attempts activation when eligible.
 */
export type ActivationOpportunity<TRunnerState = unknown> = {
  /** Stable identifier for this opportunity within the plan. */
  readonly opportunityId: string;
  /** Index of the source alternative in the raw skill record. */
  readonly sourceAlternativeIndex: number;
  /**
   * Ordered trigger windows. The runtime walks these in order:
   * if a window expires with false predicates, the next window becomes active.
   */
  readonly windows: ReadonlyArray<TriggerWindow<TRunnerState>>;
  /**
   * Opportunity-level runtime predicate.
   * Both this AND the current window's predicate must be true for eligibility.
   */
  readonly predicate: Predicate<TRunnerState>;
  /** Occurrence precondition: runtime event/state that must have happened first. */
  readonly occurrencePrecondition: Predicate<TRunnerState> | null;
  /** Sampling policy descriptor derived from condition primitives. */
  readonly samplingPolicy: SamplingPolicyDescriptor;
  /** What happens when this opportunity fires. */
  readonly effectPayload: EffectPayload;
  /** How the wit check / activation lottery works for this opportunity. */
  readonly attemptPolicy: AttemptPolicy;
  /** Whether this opportunity can re-activate after cooldown. */
  readonly repeatPolicy: RepeatPolicy;
  /** IDs of follow-up opportunities this activation enables. */
  readonly enablesFollowUps: ReadonlyArray<string>;
  /** Whether this opportunity requires a prior activation to become available. */
  readonly isFollowUp: boolean;
  /** Provenance metadata for debugging. Stripped in optimized plans. */
  readonly provenance: OpportunityProvenance | null;
};

// ============================================================
// Exclusive Opportunity Set
// ============================================================

/**
 * A left-to-right priority group of opportunities compiled from an `@` condition.
 * Only the first Eligible Opportunity attempts activation per cycle.
 *
 * A failed activation check (wit check) on the chosen branch IS still an attempt
 * and does NOT fall through to lower-priority siblings.
 *
 * An expired window with false predicates is NOT an attempt — the opportunity
 * may advance to a later window before the set re-evaluates.
 */
export type ExclusiveOpportunitySet<TRunnerState = unknown> = {
  /** Stable identifier for this exclusive set. */
  readonly setId: string;
  /** Ordered opportunities, evaluated left-to-right. */
  readonly opportunities: ReadonlyArray<ActivationOpportunity<TRunnerState>>;
  /** Set-level repeat policy (overridden by opportunity-level if present). */
  readonly repeatPolicy: RepeatPolicy;
  /** Provenance for the `@` branch structure. */
  readonly provenance: ExclusiveSetProvenance | null;
};

// ============================================================
// Skill Activation Plan
// ============================================================

/**
 * The compiled activation model for one skill.
 *
 * A plan is a graph of Activation Opportunities with:
 * - initial opportunities (available from the start)
 * - follow-up edges (enabled by prior activations)
 * - exclusive sets (for `@` branches)
 * - shared runtime rules (cooldown, repeat)
 *
 * Plans are the top-level unit that the runtime processes per skill.
 */
export type SkillActivationPlan<TRunnerState = unknown> = {
  readonly skillId: string;
  readonly normalizedRarity: NormalizedActivationRarity;
  /**
   * Initial activation entries — either standalone opportunities or exclusive sets.
   * Processed in declaration order.
   */
  readonly initialEntries: ReadonlyArray<PlanEntry<TRunnerState>>;
  /**
   * Follow-up opportunities indexed by the opportunity ID that enables them.
   * The runtime activates these when the enabling opportunity fires.
   */
  readonly followUpMap: ReadonlyMap<string, ReadonlyArray<PlanEntry<TRunnerState>>>;
  /** Plan-level cooldown policy. */
  readonly cooldownPolicy: CooldownPolicy;
  /** Plan-level repeat policy (lowest priority in the hierarchy). */
  readonly repeatPolicy: RepeatPolicy;
  /** Diagnostics produced during compilation. */
  readonly diagnostics: ReadonlyArray<ActivationDiagnostic>;
  /** Plan-level provenance. Stripped in optimized plans. */
  readonly provenance: PlanProvenance | null;
};

/**
 * A plan entry is either a standalone opportunity or an exclusive set.
 * This discriminated union lets the runtime dispatch correctly.
 */
export type PlanEntry<TRunnerState = unknown> =
  | { readonly kind: 'opportunity'; readonly opportunity: ActivationOpportunity<TRunnerState> }
  | { readonly kind: 'exclusive_set'; readonly exclusiveSet: ExclusiveOpportunitySet<TRunnerState> };

// ============================================================
// Activation Diagnostic
// ============================================================

/**
 * A compiler diagnostic recording an unsupported or unmodeled mechanic.
 * Strict compilation throws; lenient compilation collects these and
 * disables/skips affected opportunities.
 */
export type ActivationDiagnosticSeverity = 'error' | 'warning' | 'info';

export type ActivationDiagnostic = {
  readonly severity: ActivationDiagnosticSeverity;
  readonly code: string;
  readonly message: string;
  /** Which opportunity or alternative triggered the diagnostic. */
  readonly sourceAlternativeIndex: number | null;
  readonly sourceConditionFragment: string | null;
};

// ============================================================
// Provenance
// ============================================================

/**
 * Debug metadata linking a compiled opportunity back to its source.
 */
export type OpportunityProvenance = {
  readonly skillId: string;
  readonly alternativeIndex: number;
  readonly conditionString: string;
  readonly preconditionString: string | null;
  readonly branchPath: string | null;
};

export type ExclusiveSetProvenance = {
  readonly skillId: string;
  readonly conditionString: string;
  /** The raw `@`-separated branch expressions. */
  readonly branches: ReadonlyArray<string>;
};

export type PlanProvenance = {
  readonly skillId: string;
  readonly rawRarity: number;
  readonly rawActivateLot: number;
  readonly alternativeCount: number;
  readonly sourceAlternatives: ReadonlyArray<RawSkillAlternative>;
};
