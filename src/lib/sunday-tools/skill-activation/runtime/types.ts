/**
 * Activation Runtime Types
 *
 * Types for the runtime activation engine that processes compiled plans
 * during simulation. This is the final stage of the pipeline:
 *
 *   raw → parse → compile → sample → **run**
 *
 * The runtime tracks pending opportunities, walks trigger windows,
 * evaluates predicates, performs wit checks, manages cooldowns,
 * and coordinates forced activations.
 *
 * These types represent mutable simulation state — unlike the compiled
 * types which are immutable programs.
 */

import type { Region, RegionList } from '../../shared/region';
import type { PRNG } from '../../shared/random';
import type {
  ActivationOpportunity,
  AttemptPolicy,
  CooldownPolicy,
  EffectPayload,
  ExclusiveOpportunitySet,
  NormalizedActivationRarity,
  RepeatPolicy,
  SkillActivationPlan,
  SamplingPolicyDescriptor,
} from '../compiled/types';

// ============================================================
// Sampled Trigger
// ============================================================

/**
 * The result of sampling an Activation Opportunity.
 * Contains ordered runtime trigger windows selected by the sampling policy.
 *
 * For immediate skills, windows contains ALL candidate regions in order.
 * For random skills, windows contains exactly one sampled region.
 */
export type SampledTrigger = {
  readonly windows: RegionList;
};

// ============================================================
// Pending Opportunity
// ============================================================

/**
 * Runtime state for a single Activation Opportunity being tracked
 * by the runner. This is the new-engine equivalent of the legacy PendingSkill.
 *
 * A pending opportunity walks through its sampled windows in order:
 * - If the current window expires with predicates false → advance to next
 * - If predicates are true → attempt activation (wit check)
 * - If wit check fails → consumed, no retry on later windows
 * - If no more windows → removed
 */
export type PendingOpportunity<TRunnerState = unknown> = {
  /** Reference to the compiled opportunity this tracks. */
  readonly opportunity: ActivationOpportunity<TRunnerState>;
  /** Sampled trigger windows for this simulation round. */
  readonly sampledTrigger: SampledTrigger;
  /** Index of the current active window in sampledTrigger.windows. */
  currentWindowIndex: number;
  /** Whether this opportunity has been consumed (activated or failed). */
  consumed: boolean;
  /** Whether this opportunity is blocked by cooldown. */
  cooldownBlocked: boolean;
  /** Whether this opportunity is waiting for its follow-up enabler. */
  awaitingEnablement: boolean;
};

/**
 * Convenience accessor for the current trigger window of a pending opportunity.
 */
export type CurrentWindow = {
  readonly region: Region;
  readonly isLastWindow: boolean;
};

// ============================================================
// Pending Exclusive Set
// ============================================================

/**
 * Runtime state for an Exclusive Opportunity Set.
 * Tracks which opportunities in the set are still live and
 * enforces left-to-right priority evaluation.
 */
export type PendingExclusiveSet<TRunnerState = unknown> = {
  /** Reference to the compiled exclusive set. */
  readonly exclusiveSet: ExclusiveOpportunitySet<TRunnerState>;
  /** Pending opportunities within this set, in priority order. */
  readonly pendingOpportunities: ReadonlyArray<PendingOpportunity<TRunnerState>>;
  /** Whether the entire set has been consumed by an activation attempt. */
  consumed: boolean;
};

// ============================================================
// Pending Plan
// ============================================================

/**
 * Runtime state for a Skill Activation Plan.
 * Contains all pending entries (opportunities + exclusive sets)
 * and manages plan-level cooldown state.
 */
export type PendingPlan<TRunnerState = unknown> = {
  readonly skillId: string;
  /** Reference to the compiled plan. */
  readonly plan: SkillActivationPlan<TRunnerState>;
  /** Pending initial entries (opportunities or exclusive sets). */
  readonly pendingEntries: Array<PendingPlanEntry<TRunnerState>>;
  /** Follow-up entries waiting for enablement. */
  readonly pendingFollowUps: Array<PendingPlanEntry<TRunnerState>>;
  /** Plan-level cooldown state. */
  readonly cooldownState: CooldownState;
  /** Rarity bucket for wit-check bypass logic. */
  readonly normalizedRarity: NormalizedActivationRarity;
  /** Whether this plan has been fully exhausted. */
  exhausted: boolean;
};

/**
 * A pending entry is either a standalone opportunity or an exclusive set.
 */
export type PendingPlanEntry<TRunnerState = unknown> =
  | { readonly kind: 'opportunity'; readonly pending: PendingOpportunity<TRunnerState> }
  | { readonly kind: 'exclusive_set'; readonly pending: PendingExclusiveSet<TRunnerState> };

// ============================================================
// Cooldown State
// ============================================================

/**
 * Mutable cooldown tracking for a plan.
 */
export type CooldownState = {
  /** Whether cooldown is currently active. */
  active: boolean;
  /** Remaining lockout time in seconds. Null when not active. */
  remainingSeconds: number | null;
  /** The compiled cooldown policy. */
  readonly policy: CooldownPolicy;
};

// ============================================================
// Activation Attempt
// ============================================================

/**
 * Represents the outcome of an activation attempt on an Eligible Opportunity.
 */
export type ActivationAttemptResult =
  | { readonly outcome: 'activated'; readonly opportunity: ActivationOpportunity }
  | { readonly outcome: 'wit_check_failed'; readonly opportunity: ActivationOpportunity }
  | { readonly outcome: 'cooldown_blocked'; readonly opportunity: ActivationOpportunity }
  | { readonly outcome: 'predicate_false' }
  | { readonly outcome: 'window_expired' }
  | { readonly outcome: 'not_eligible' };

// ============================================================
// Activation Event
// ============================================================

/**
 * Emitted when a skill activation occurs.
 * Used for instrumentation, UI updates, and activation counter tracking.
 */
export type ActivationEvent<TRunnerState = unknown> = {
  readonly skillId: string;
  readonly opportunity: ActivationOpportunity<TRunnerState>;
  readonly effectPayload: EffectPayload;
  readonly normalizedRarity: NormalizedActivationRarity;
  readonly activationPosition: number;
  readonly activationTime: number;
  /** Whether this was a forced activation triggered by another skill's effect. */
  readonly wasForced: boolean;
};

// ============================================================
// Forced Activation Request
// ============================================================

/**
 * A request to immediately activate a pending plan for another skill.
 * Produced by an EffectPayload's forcedActivationTargets.
 *
 * Forced activations:
 * - Bypass normal trigger-window eligibility
 * - Bypass wit checks
 * - Consume/exhaust the forced plan
 * - Count as real activations for counters
 * - Do not rewind the frame scheduler
 * - Resolve only one forced plan per source activation (no recursive chains)
 */
export type ForcedActivationRequest = {
  readonly sourceSkillId: string;
  readonly targetSkillId: string;
  readonly activationPosition: number;
};

// ============================================================
// Sampling Interface
// ============================================================

/**
 * Samples compiled opportunities into runtime trigger windows.
 * Bridges the compiled SamplingPolicyDescriptor to actual RNG-based placement.
 */
export type ActivationSampler = {
  /**
   * Sample trigger windows for an opportunity.
   * Returns one SampledTrigger per simulation sample.
   */
  sampleOpportunity: (
    opportunity: ActivationOpportunity,
    nsamples: number,
    rng: PRNG,
  ) => ReadonlyArray<SampledTrigger>;
};

// ============================================================
// Runtime Engine Interface
// ============================================================

/**
 * The activation runtime engine.
 * Processes pending plans each frame and produces activation events.
 */
export type ActivationRuntime<TRunnerState = unknown> = {
  /**
   * Initialize pending plans from compiled plans and sampled triggers.
   * Called once per simulation round.
   */
  initialize: (
    plans: ReadonlyArray<SkillActivationPlan<TRunnerState>>,
    sampler: ActivationSampler,
    nsamples: number,
    roundIteration: number,
    rng: PRNG,
  ) => RuntimeState<TRunnerState>;

  /**
   * Process one frame of activation logic.
   * Returns activation events that occurred this frame.
   */
  processFrame: (
    state: RuntimeState<TRunnerState>,
    frameContext: FrameContext<TRunnerState>,
  ) => ReadonlyArray<ActivationEvent<TRunnerState>>;

  /**
   * Force-activate a specific skill's pending plan.
   * Returns the activation event if successful, null if the skill has no pending plan.
   */
  forceActivate: (
    state: RuntimeState<TRunnerState>,
    request: ForcedActivationRequest,
  ) => ActivationEvent<TRunnerState> | null;
};

/**
 * Mutable runtime state for the activation engine.
 * Owned by the runner, mutated by the runtime each frame.
 */
export type RuntimeState<TRunnerState = unknown> = {
  /** All pending plans being tracked, in canonical skill ID order. */
  readonly pendingPlans: Array<PendingPlan<TRunnerState>>;
  /** Skills that have been activated (for activation-count conditions). */
  readonly activatedSkillIds: Set<string>;
  /** Total activation count (for activate_count conditions). */
  activationCount: number;
  /** Plans flagged for removal after current frame processing. */
  readonly pendingRemoval: Set<string>;
};

/**
 * Per-frame context passed to the runtime for predicate evaluation
 * and position/time checks.
 */
export type FrameContext<TRunnerState = unknown> = {
  /** Current runner position in meters. */
  readonly position: number;
  /** Current accumulated race time in seconds. */
  readonly accumulatedTime: number;
  /** Runner state for predicate evaluation. */
  readonly runnerState: TRunnerState;
  /** Wit check function. Returns true if the check passes. */
  readonly doWitCheck: () => boolean;
  /** Delta time for this frame in seconds. */
  readonly dt: number;
};
