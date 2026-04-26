# Uma Race Simulation

This context models how race mechanics, skill conditions, activation windows, and runtime effects are represented in the simulator. It exists to keep mechanic terms stable as the skill engine grows more complex.

## Language

**Skill Alternative**:
A data-level item in a skill's `alternatives` array that defines one candidate branch from extracted skill data.
_Avoid_: Alternative trigger, alt trigger

**Activation Opportunity**:
A compiled logical skill branch that may activate, carrying one or more ordered trigger windows, its branch-local predicates, and the effects it can produce.
_Avoid_: Trigger, proc window, sampled trigger

**Static Precondition**:
A setup-time requirement that determines whether a Skill Alternative can compile into Activation Opportunities at all.
_Avoid_: Pre-trigger

**Occurrence Precondition**:
A runtime prerequisite event or state that must have happened before an Activation Opportunity may activate.
_Avoid_: Pre-trigger

**Window Precondition**:
A prerequisite that constrains the eligible trigger windows for an Activation Opportunity without necessarily eliminating the opportunity.
_Avoid_: Pre-trigger

**Skill Activation Plan**:
The compiled activation model for one skill, containing its Activation Opportunities and shared runtime activation rules such as cooldown.
_Avoid_: Skill trigger list, pending trigger bag

**Mechanic Fidelity Constraint**:
The requirement that simulator architecture model inferred game mechanics rather than inventing behavior solely for software convenience.
_Avoid_: Clean-room rules, app-only semantics

**Cooldown**:
A runtime lockout on a Skill Activation Plan after a skill activation that delays whether later Activation Opportunities may attempt activation.
_Avoid_: Duration, effect duration

**Base Cooldown**:
The raw extracted cooldown value attached to a Skill Alternative before course-distance scaling and plan compilation.
_Avoid_: float_cooldown_time, effect cooldown

**Lockout Duration**:
The compiled, course-scaled runtime duration for a plan-level Cooldown lockout.
_Avoid_: Cooldown duration, base cooldown

**Follow-up Opportunity**:
An Activation Opportunity that is enabled by a prior activation from the same Skill Activation Plan.
_Avoid_: Second trigger, chained effect

**Exclusive Opportunity Set**:
A left-to-right priority group of Activation Opportunities compiled from an `@` condition where only the first eligible branch should attempt activation for a skill activation cycle.
_Avoid_: OR union, alternative trigger

**Repeat Policy**:
A rule on an Activation Opportunity, Exclusive Opportunity Set, or Skill Activation Plan that determines whether successful activation consumes the target or allows another attempt after cooldown.
_Avoid_: Cooldown, duration

**Predicate**:
A condition comparison with evaluation-phase metadata that may be resolved during compilation, runtime, or both.
_Avoid_: Raw condition string, dynamic condition closure

**Runtime Predicate**:
A Predicate evaluated during simulation to determine whether an Activation Opportunity or Trigger Window is eligible.
_Avoid_: Dynamic condition closure

**Eligible Opportunity**:
An Activation Opportunity whose current window is active, preconditions are satisfied, runtime predicates are true, and activation is not blocked by cooldown or repeat state.
_Avoid_: Active trigger, matching branch

**Trigger Window**:
A distance-based interval in which an Activation Opportunity may become eligible to attempt activation.
_Avoid_: Time window, trigger

**Sampling Policy**:
A compiled rule derived from game-mechanic condition primitives that turns candidate trigger windows into runtime trigger windows.
_Avoid_: Trigger strategy, randomizer choice

**Activation Diagnostic**:
A compiler diagnostic that records an unsupported or unmodeled skill mechanic without pretending the simulator handled it correctly.
_Avoid_: Silent fallback, best effort behavior

**Provenance**:
Debug metadata that links compiled activation objects back to source skill alternatives, condition fragments, branch order, and extracted data.
_Avoid_: Runtime identity

**Effect Payload**:
The compiled effect-side semantics that define what happens when an Activation Opportunity activates, including target selection and forced activation side effects at activation time.
_Avoid_: Raw effect, ability row

**Raw Skill Rarity**:
The exact rarity value extracted from `skill_data` before any activation-runtime normalization.
_Avoid_: Unique skill, normalized rarity

**Unique-Family Raw Rarity**:
The subset of Raw Skill Rarity values `3`, `4`, and `5` that the current runtime collapses into one unique activation bucket.
_Avoid_: Unique skill, pink skill

**Normalized Activation Rarity**:
The runtime rarity bucket used by the activation engine after raw rarity normalization.
_Avoid_: Raw rarity, DB rarity

**Unique Skill**:
A skill treated by the activation engine as having Normalized Activation Rarity `Unique`.
_Avoid_: Raw rarity 3/4/5, character-bound skill family

**Inherited Unique**:
A raw-rarity-`1` skill that represents the inherited or gene version of a unique-family skill rather than the base unique-family skill itself.
_Avoid_: Base unique, raw rarity 1 skill in general

**Attempt Policy**:
The compiled rule that decides whether an Eligible Opportunity must pass a normal activation check such as a pre-race Wit check and whether failure still consumes the attempt.
_Avoid_: Predicate, effect behavior

**Activation Lot**:
The raw extracted `activate_lot` flag where `1` means the skill uses the normal pre-race activation lottery or Wit-check path and `0` means it does not.
_Avoid_: Runtime-activation flag, generic lottery field, Attempt Policy

**Forced Activation**:
An effect-side mechanic that immediately activates another pending Skill Activation Plan and exhausts it so it cannot activate again later.
_Avoid_: Follow-up Opportunity, normal trigger

**Additional Activate**:
An effect-side mechanic where an activated skill registers a duration-bound watcher that applies an effect when another condition happens while the skill remains active.
_Avoid_: Follow-up Opportunity, repeated skill activation

## Relationships

- A skill contains one or more **Skill Alternatives**
- Simulator design decisions are constrained by the **Mechanic Fidelity Constraint**
- A skill compiles into one **Skill Activation Plan**
- A **Skill Activation Plan** is a graph of **Activation Opportunities**
- A **Skill Activation Plan** contains one or more initial **Activation Opportunities**
- A skill has one **Raw Skill Rarity** in extracted data
- **Unique-Family Raw Rarity** is currently the set of **Raw Skill Rarity** values `3`, `4`, and `5`
- A compiler/runtime maps **Raw Skill Rarity** into **Normalized Activation Rarity**
- A **Unique Skill** has **Normalized Activation Rarity** `Unique`
- An **Inherited Unique** has **Raw Skill Rarity** `1` but belongs to a unique-family skill lineage rather than an ordinary white-skill lineage
- A **Skill Alternative** compiles into one or more **Activation Opportunities**
- A **Static Precondition** can prevent a **Skill Alternative** from compiling into any **Activation Opportunities**
- An **Occurrence Precondition** gates runtime activation of an **Activation Opportunity**
- A **Window Precondition** constrains the trigger windows of an **Activation Opportunity**
- An **Activation Opportunity** contains one or more ordered **Trigger Windows**
- An **Activation Opportunity** owns one **Attempt Policy**
- A failed normal check governed by an **Attempt Policy** may still consume the activation attempt
- **Trigger Windows** are distance-based; time constraints are modeled as predicates, cooldown state, or effect duration state
- **Predicates** carry evaluation-phase metadata such as compile, runtime, or hybrid
- **Runtime Predicates** may exist at both Activation Opportunity level and Trigger Window level
- A **Base Cooldown** belongs to a **Skill Alternative** in raw extracted data
- A **Cooldown** starts after a successful activation from a **Skill Activation Plan** and can block later **Activation Opportunities** until it expires
- A compiler derives a plan-level **Cooldown** policy from one or more raw **Base Cooldown** values
- A **Lockout Duration** is the compiled runtime value used to enforce a plan-level **Cooldown**
- A **Follow-up Opportunity** is enabled by another **Activation Opportunity** rather than being initially available
- An **Activation Lot** belongs to a raw extracted skill record and is compiled into an **Attempt Policy**
- An **Activation Opportunity** owns one or more **Effect Payloads**
- **Effect Payloads** are produced by effect-specific compiler/resolver modules, not by the activation compiler itself
- Target selection is always resolved inside the **Effect Payload** when the skill triggers
- **Forced Activation** is resolved by an **Effect Payload** on the same frame and bypasses normal trigger-window eligibility and normal chance/wit checks for the forced skill while still consuming/exhausting it
- **Forced Activation** counts as a real skill activation for activation counters and downstream activation conditions
- **Forced Activation** does not rewind the frame scheduler; plans whose skill ID order has already been checked wait until the next frame to react
- **Forced Activation** resolves only one forced skill activation per source activation; recursive forced-activation chains are treated as unsupported unless confirmed by game mechanics
- **Additional Activate** is handled by **Effect Payload** runtime behavior, not Activation Opportunity graph topology
- **Additional Activate** applications are effect applications, not new skill activations, and do not increment skill activation counters
- Follow-up topology is declared in the **Skill Activation Plan**; **Effect Payloads** may enable declared follow-up IDs but do not dynamically create new opportunities unless a confirmed game mechanic requires it
- An **Activation Opportunity** may enable zero or more follow-up **Activation Opportunities**
- An `@` condition compiles into an **Exclusive Opportunity Set** rather than a unioned region list
- An **Exclusive Opportunity Set** chooses the first **Eligible Opportunity** by left-to-right priority
- A failed activation chance or wit check on an **Eligible Opportunity** is still an activation attempt and does not fall through to lower-priority siblings
- An expired trigger window with false predicates is not an activation attempt; the **Activation Opportunity** may advance to a later window
- An **Activation Opportunity** may activate multiple times across its windows only when its **Repeat Policy** allows repeat-after-cooldown behavior
- **Repeat Policy** is resolved hierarchically: Activation Opportunity overrides Exclusive Opportunity Set, which overrides Skill Activation Plan, which overrides the default one-shot behavior
- An **Exclusive Opportunity Set** defaults to being consumed after one successful branch activation unless a **Repeat Policy** says otherwise
- Compilation produces candidate trigger windows without RNG
- **Sampling Policy** is derived from condition primitives rather than assigned arbitrarily
- A branch should contain at most one trigger-placement sampling primitive unless a documented game mechanic proves a composite exists
- Unsupported mechanics produce **Activation Diagnostics**; strict compilation throws while lenient compilation skips or disables affected opportunities
- Compiled/debug activation plans preserve **Provenance**; optimized runtime plans may strip it
- Sampling turns candidate trigger windows into runtime trigger windows using a **Sampling Policy** and RNG
- A runner samples zero or more **Activation Opportunities** into runtime pending skill state
- Skill activation plans are processed in canonical skill ID order within a frame, allowing lower-ID skills to affect higher-ID skills in the same frame but not the reverse

## Example dialogue

> **Dev:** "Does this skill have two triggers?"
> **Domain expert:** "More precisely, it has one **Activation Opportunity** with two ordered trigger windows; if the first expires, the runner may still activate on the second."

## Flagged ambiguities

- "trigger" was being used to mean both a candidate activation region and a runtime sampled attempt — resolved: use **Activation Opportunity** for the canonical branch-level concept.
- "alternative trigger" was being used to mean an item in a skill's `alternatives` array — resolved: use **Skill Alternative** for the data-level object.
- "cooldown" was being used to mean both the raw extracted field and the compiled runtime value — resolved: use **Base Cooldown** for raw extracted data and **Lockout Duration** for the compiled runtime duration.
- "unique skill" was being used to mean both raw DB rarity values and normalized runtime rarity — resolved: use **Raw Skill Rarity** / **Unique-Family Raw Rarity** for extracted data and **Unique Skill** for the normalized activation-runtime bucket.
- `activate_lot` was being treated as ambiguous runtime metadata — resolved: **Activation Lot** means whether the skill uses the normal pre-race activation lottery or Wit-check path.
