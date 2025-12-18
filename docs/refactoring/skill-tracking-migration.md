# Skill Tracking Migration Guide

## Overview

This document provides a step-by-step guide for refactoring the race simulation's skill tracking system from **effect-level tracking** to **skill-centric tracking**.

## Problem Statement

### Current Behavior (Bug)

Multi-effect skills like "Stamina Siphon" record their effects at **different positions**:

```
Effect 1 (Self recovery +350): activated at 537m
Effect 2 (Drain opponents -100): activated at 1455m
```

This is incorrect. Both effects should trigger at the **same position** since they belong to the same skill activation.

### Root Cause

1. **Perspective Duplication**: In `compare.ts`, skills are added with both `Self` and `Other` perspectives:

   ```typescript
   runnerARaceSolver.addSkill(skillId, SkillPerspective.Self);
   runnerARaceSolver.addSkill(skillId, SkillPerspective.Other);
   ```

2. **Random Trigger Positions**: Skills with `phase_random==1` get different random positions per perspective.

3. **Per-Effect Callbacks**: The `onSkillActivate` callback is called inside the effect loop, treating each effect as a separate activation.

### Solution

Refactor to **skill-centric tracking** where:

- All effects from a single skill activation share the same position
- Callback is called once per skill (not per effect)
- Effects are grouped in a single data structure

---

## Migration Phases

- [Phase 1: Data Structure Updates](#phase-1-data-structure-updates)
- [Phase 2: RaceSolver Core Changes](#phase-2-racesolver-core-changes)
- [Phase 3: Data Collection Updates](#phase-3-data-collection-updates)
- [Phase 4: Visualization Layer](#phase-4-visualization-layer)
- [Phase 5: Testing and Verification](#phase-5-testing-and-verification)

---

## Key Files

| File                                                  | Purpose                                |
| ----------------------------------------------------- | -------------------------------------- |
| `src/modules/simulation/lib/RaceSolver.ts`            | Core simulation engine                 |
| `src/modules/simulation/compare.types.ts`             | Type definitions for skill activations |
| `src/utils/compare.ts`                                | Race comparison and data collection    |
| `src/modules/skills/effects-query.ts`                 | Query utility for skill data           |
| `src/modules/racetrack/hooks/useVisualizationData.ts` | Timeline visualization                 |

---

## Phase 1: Data Structure Updates

This phase updates the core type definitions to support grouped effects.

### 1.1 Update `ActiveSkill` Interface

**File:** `src/modules/simulation/lib/RaceSolver.ts`

**Before:**

```typescript
export interface ActiveSkill {
  executionId: string;
  skillId: string;
  perspective: ISkillPerspective;
  durationTimer: Timer;
  modifier: number;
  effectType: ISkillType;
  effectTarget: ISkillTarget;
}
```

**After:**

```typescript
export interface ActiveEffect {
  effectType: ISkillType;
  effectTarget: ISkillTarget;
  modifier: number;
  durationTimer: Timer;
  naturalDeceleration?: boolean; // For CurrentSpeedWithNaturalDeceleration
}

export interface ActiveSkill {
  executionId: string;
  skillId: string;
  perspective: ISkillPerspective;
  activationPosition: number; // Position where skill activated
  effects: ActiveEffect[]; // All effects grouped together
}
```

**Rationale:**

- `ActiveEffect` captures individual effect properties including duration timer
- `ActiveSkill` now holds multiple effects with a single activation position
- The `activationPosition` ensures all effects share the same location

### 1.2 Add `CompactEffect` Type for Callbacks

**File:** `src/modules/simulation/lib/RaceSolver.ts` (or a shared types file)

```typescript
export type CompactEffect = {
  type: ISkillType;
  target: ISkillTarget;
  duration?: number; // Scaled duration, only for duration-based effects
};
```

**Purpose:** Lightweight effect representation for callback payloads (no timer references).

### 1.3 Update `SkillActivation` Type

**File:** `src/modules/simulation/compare.types.ts`

**Before:**

```typescript
export type SkillActivation = {
  executionId: string;
  skillId: string;
  start: number;
  end: number;
  perspective: ISkillPerspective;
  effectType: ISkillType;
  effectTarget: ISkillTarget;
};

export type SkillActivationMap = Map<string, SkillActivation[]>;
```

**After:**

```typescript
export type SkillEffectRecord = {
  effectType: ISkillType;
  effectTarget: ISkillTarget;
};

export type SkillActivation = {
  executionId: string;
  skillId: string;
  start: number;
  end: number;
  perspective: ISkillPerspective;
  effects: SkillEffectRecord[]; // All effects grouped
};

// Map now stores single activation per executionId (not array)
export type SkillActivationMap = Map<string, SkillActivation>;
```

**Rationale:**

- Each `executionId` corresponds to exactly one skill activation
- Effects are grouped under the activation, ensuring same `start` position

### 1.4 Update Callback Signatures

**File:** `src/modules/simulation/lib/RaceSolver.ts`

**Before:**

```typescript
onSkillActivate: (
  raceSolver: RaceSolver,
  executionId: string,
  skillId: string,
  perspective: ISkillPerspective,
  type: ISkillType,
  target: ISkillTarget,
) => void;

onSkillDeactivate: (
  raceSolver: RaceSolver,
  executionId: string,
  skillId: string,
  perspective: ISkillPerspective,
  type: ISkillType,
  target: ISkillTarget,
) => void;
```

**After:**

```typescript
onSkillActivate: (
  raceSolver: RaceSolver,
  executionId: string,
  skillId: string,
  perspective: ISkillPerspective,
  position: number,           // Activation position
  effects: CompactEffect[],   // All effects
) => void;

onSkillDeactivate: (
  raceSolver: RaceSolver,
  executionId: string,
  skillId: string,
  perspective: ISkillPerspective,
  effectType: ISkillType,     // Which effect expired (keep for granular tracking)
  effectTarget: ISkillTarget,
) => void;
```

**Notes:**

- `onSkillActivate` now receives position and all effects at once
- `onSkillDeactivate` remains per-effect (effects may expire at different times)

### 1.5 Checklist

- [ ] Add `ActiveEffect` interface
- [ ] Update `ActiveSkill` interface with `activationPosition` and `effects[]`
- [ ] Add `CompactEffect` type
- [ ] Update `SkillActivation` type with `effects[]`
- [ ] Change `SkillActivationMap` from `Map<string, SkillActivation[]>` to `Map<string, SkillActivation>`
- [ ] Update `onSkillActivate` signature
- [ ] Update all call sites of `onSkillActivate`

---

## Phase 2: RaceSolver Core Changes

This phase refactors the `RaceSolver` class to use unified skill storage and single-callback activation.

### 2.1 Update `activateSkill()` Method

**Key Changes:**

1. Build all effects first, then store as single `ActiveSkill`
2. Apply modifiers during effect processing (same as before)
3. Call `onSkillActivate` **once** after all effects processed

**Before (callback inside loop):**

```typescript
activateSkill(skill: PendingSkill) {
  const executionId = crypto.randomUUID();

  for (const skillEffect of sortedEffects) {
    // ... apply effect and push to separate arrays ...

    if (shouldTrackEffect(skillEffect)) {
      this.onSkillActivate(  // Called per effect!
        this,
        executionId,
        skill.skillId,
        skill.perspective,
        skillEffect.type,
        skillEffect.target,
      );
    }
  }

  ++this.activateCount[this.phase];
  this.usedSkills.add(skill.skillId);
}
```

**After (callback outside loop):**

```typescript
activateSkill(skill: PendingSkill) {
  const executionId = crypto.randomUUID();
  const activeEffects: ActiveEffect[] = [];
  const trackedEffects: CompactEffect[] = [];

  for (const skillEffect of sortedEffects) {
    const scaledDuration = /* ... */;

    // Apply instant effects (Recovery, green skills, etc.)
    if (this.applyInstantEffect(skillEffect)) {
      // Instant effects applied immediately
      if (shouldTrackEffect(skillEffect)) {
        trackedEffects.push({
          type: skillEffect.type,
          target: skillEffect.target,
        });
      }
      continue;
    }

    // Apply modifier for duration-based effects
    this.applyEffectModifier(skillEffect);

    // Build active effect
    activeEffects.push({
      effectType: skillEffect.type,
      effectTarget: skillEffect.target,
      modifier: skillEffect.modifier,
      durationTimer: this.getNewTimer(-scaledDuration),
      naturalDeceleration: skillEffect.type === SkillType.CurrentSpeedWithNaturalDeceleration,
    });

    if (shouldTrackEffect(skillEffect)) {
      trackedEffects.push({
        type: skillEffect.type,
        target: skillEffect.target,
        duration: scaledDuration,
      });
    }
  }

  // Store skill with all effects
  if (activeEffects.length > 0) {
    this.activeSkills.set(executionId, {
      executionId,
      skillId: skill.skillId,
      perspective: skill.perspective,
      activationPosition: this.pos,
      effects: activeEffects,
    });
  }

  // Single callback for entire skill activation
  if (trackedEffects.length > 0) {
    this.onSkillActivate(
      this,
      executionId,
      skill.skillId,
      skill.perspective,
      this.pos,            // Position passed explicitly
      trackedEffects,      // All effects at once
    );
  }

  ++this.activateCount[this.phase];
  this.usedSkills.add(skill.skillId);
}
```

### 2.3 Add Helper Methods

**New helper: `applyInstantEffect()`**

```typescript
private applyInstantEffect(effect: SkillEffect): boolean {
  switch (effect.type) {
    case SkillType.SpeedUp:
      this.horse.speed = Math.max(this.horse.speed + effect.modifier, 1);
      return true;
    case SkillType.StaminaUp:
      this.horse.stamina = Math.max(this.horse.stamina + effect.modifier, 1);
      this.horse.rawStamina = Math.max(this.horse.rawStamina + effect.modifier, 1);
      return true;
    case SkillType.PowerUp:
      this.horse.power = Math.max(this.horse.power + effect.modifier, 1);
      return true;
    case SkillType.GutsUp:
      this.horse.guts = Math.max(this.horse.guts + effect.modifier, 1);
      return true;
    case SkillType.WisdomUp:
      this.horse.wisdom = Math.max(this.horse.wisdom + effect.modifier, 1);
      return true;
    case SkillType.MultiplyStartDelay:
      this.startDelay *= effect.modifier;
      return true;
    case SkillType.SetStartDelay:
      this.startDelay = effect.modifier;
      return true;
    case SkillType.Recovery:
      ++this.activateCountHeal;
      this.hp.recover(effect.modifier, this);
      if (this.phase >= 2 && !this.isLastSpurt) {
        this.updateLastSpurtState();
      }
      return true;
    case SkillType.ActivateRandomGold:
      this.doActivateRandomGold(effect.modifier);
      return true;
    case SkillType.ExtendEvolvedDuration:
      this.modifiers.specialSkillDurationScaling = effect.modifier;
      return true;
    default:
      return false;  // Duration-based effect
  }
}
```

**New helper: `applyEffectModifier()`**

```typescript
private applyEffectModifier(effect: SkillEffect): void {
  switch (effect.type) {
    case SkillType.TargetSpeed:
      this.modifiers.targetSpeed.add(effect.modifier);
      break;
    case SkillType.CurrentSpeed:
    case SkillType.CurrentSpeedWithNaturalDeceleration:
      this.modifiers.currentSpeed.add(effect.modifier);
      break;
    case SkillType.Accel:
      this.modifiers.accel.add(effect.modifier);
      break;
    // LaneMovementSpeed and ChangeLane don't modify accumulators
  }
}
```

**New helper: `removeEffectModifier()`**

```typescript
private removeEffectModifier(effect: ActiveEffect): void {
  switch (effect.effectType) {
    case SkillType.TargetSpeed:
      this.modifiers.targetSpeed.add(-effect.modifier);
      break;
    case SkillType.CurrentSpeed:
    case SkillType.CurrentSpeedWithNaturalDeceleration:
      this.modifiers.currentSpeed.add(-effect.modifier);
      if (effect.naturalDeceleration) {
        this.modifiers.oneFrameAccel += effect.modifier;
      }
      break;
    case SkillType.Accel:
      this.modifiers.accel.add(-effect.modifier);
      break;
  }
}
```

### 2.4 Simplify `processSkillActivations()`

**Before (5 separate loops):**

```typescript
processSkillActivations() {
  // Loop 1: Target Speed Skills
  let writeIdx = 0;
  for (let i = 0; i < this.activeTargetSpeedSkills.length; i++) {
    const skill = this.activeTargetSpeedSkills[i];
    if (skill.durationTimer.t < 0) {
      this.activeTargetSpeedSkills[writeIdx++] = skill;
      continue;
    }
    this.modifiers.targetSpeed.add(-skill.modifier);
    this.onSkillDeactivate(/* ... */);
  }
  this.activeTargetSpeedSkills.length = writeIdx;

  // ... 4 more similar loops ...

  // Process pending skills
  // ...
}
```

**After (single unified loop):**

```typescript
processSkillActivations() {
  // Process active skills
  for (const [executionId, skill] of this.activeSkills) {
    // Process each effect, removing expired ones
    for (let i = skill.effects.length - 1; i >= 0; i--) {
      const effect = skill.effects[i];

      if (effect.durationTimer.t >= 0) {
        // Effect expired
        this.removeEffectModifier(effect);
        this.onSkillDeactivate(
          this,
          executionId,
          skill.skillId,
          skill.perspective,
          effect.effectType,
          effect.effectTarget,
        );
        skill.effects.splice(i, 1);
      }
    }

    // Remove skill if all effects expired
    if (skill.effects.length === 0) {
      this.activeSkills.delete(executionId);
    }
  }

  // Process pending skills (same as before)
  // ...
}
```

### 2.5 Update `cleanup()` Method

**Before:**

```typescript
cleanup() {
  const callDeactivateHook = (activeSkill: ActiveSkill) => {
    this.onSkillDeactivate(/* ... */);
  };

  this.activeTargetSpeedSkills.forEach(callDeactivateHook);
  this.activeCurrentSpeedSkills.forEach(callDeactivateHook);
  this.activeAccelSkills.forEach(callDeactivateHook);
  this.activeLaneMovementSkills.forEach(callDeactivateHook);
  this.activeChangeLaneSkills.forEach(callDeactivateHook);
}
```

**After:**

```typescript
cleanup() {
  for (const [executionId, skill] of this.activeSkills) {
    for (const effect of skill.effects) {
      this.onSkillDeactivate(
        this,
        executionId,
        skill.skillId,
        skill.perspective,
        effect.effectType,
        effect.effectTarget,
      );
    }
  }
  this.activeSkills.clear();
}
```

### 2.6 Update Position Keep Checks

The position keep logic checks if speed skills are active:

**Before:**

```typescript
if (
  this.activeTargetSpeedSkills.length == 0 &&
  this.activeCurrentSpeedSkills.length == 0
) {
  // Enter pace down mode
}
```

**After:**

```typescript
private hasActiveSpeedEffects(): boolean {
  for (const skill of this.activeSkills.values()) {
    for (const effect of skill.effects) {
      if (
        effect.effectType === SkillType.TargetSpeed ||
        effect.effectType === SkillType.CurrentSpeed ||
        effect.effectType === SkillType.CurrentSpeedWithNaturalDeceleration
      ) {
        return true;
      }
    }
  }
  return false;
}

// Usage
if (!this.hasActiveSpeedEffects()) {
  // Enter pace down mode
}
```

### 2.7 Checklist

- [ ] Replace 5 arrays with `activeSkills: Map<string, ActiveSkill>`
- [ ] Update constructor initialization
- [ ] Add `applyInstantEffect()` helper
- [ ] Add `applyEffectModifier()` helper
- [ ] Add `removeEffectModifier()` helper
- [ ] Refactor `activateSkill()` to call callback once
- [ ] Simplify `processSkillActivations()` to single loop
- [ ] Update `cleanup()` method
- [ ] Add `hasActiveSpeedEffects()` helper
- [ ] Update position keep checks
- [ ] Update any other code that references the old arrays

---

## Phase 3: Data Collection Updates

This phase updates the comparison callbacks in `compare.ts` to handle the new grouped effect structure.

### 3.1 Update `getActivator()` Function

**File:** `src/utils/compare.ts`

**Before (per-effect recording):**

```typescript
const getActivator = (
  skillsSet: Map<string, SkillActivation[]>,
  othersSet: Map<string, SkillActivation[]>,
) => {
  return (
    raceSolver: RaceSolver,
    executionId: string,
    skillId: string,
    perspective: ISkillPerspective,
    effectType: ISkillType,
    effectTarget: ISkillTarget,
  ) => {
    if (['asitame', 'staminasyoubu'].includes(skillId)) {
      return;
    }

    if (effectTarget === SkillTarget.Self) {
      const skillSetValue = skillsSet.get(executionId) ?? [];
      skillSetValue.push({
        executionId,
        skillId,
        start: raceSolver.pos, // Each effect gets raceSolver.pos
        end: raceSolver.pos,
        perspective,
        effectType,
        effectTarget,
      });
      skillsSet.set(executionId, skillSetValue);
    }

    if (effectTarget !== SkillTarget.Self) {
      const skillSetValue = othersSet.get(executionId) ?? [];
      skillSetValue.push({
        executionId,
        skillId,
        start: raceSolver.pos,
        end: raceSolver.pos,
        perspective,
        effectType,
        effectTarget,
      });
      othersSet.set(executionId, skillSetValue);
    }
  };
};
```

**After (skill-centric recording):**

```typescript
const getActivator = (
  skillsSet: Map<string, SkillActivation>, // Note: single activation, not array
  othersSet: Map<string, SkillActivation>,
) => {
  return (
    raceSolver: RaceSolver,
    executionId: string,
    skillId: string,
    perspective: ISkillPerspective,
    position: number, // Explicit position
    effects: CompactEffect[], // All effects grouped
  ) => {
    if (['asitame', 'staminasyoubu'].includes(skillId)) {
      return;
    }

    // Separate effects by target
    const selfEffects = effects.filter((e) => e.target === SkillTarget.Self);
    const otherEffects = effects.filter((e) => e.target !== SkillTarget.Self);

    // Record self-targeting effects
    if (selfEffects.length > 0) {
      skillsSet.set(executionId, {
        executionId,
        skillId,
        start: position, // Single position for all effects
        end: position,
        perspective,
        effects: selfEffects.map((e) => ({
          effectType: e.type,
          effectTarget: e.target,
        })),
      });
    }

    // Record other-targeting effects (debuffs, etc.)
    if (otherEffects.length > 0) {
      othersSet.set(executionId, {
        executionId,
        skillId,
        start: position,
        end: position,
        perspective,
        effects: otherEffects.map((e) => ({
          effectType: e.type,
          effectTarget: e.target,
        })),
      });
    }
  };
};
```

**Key Changes:**

- Takes `position` and `effects[]` instead of single `effectType`/`effectTarget`
- Stores single `SkillActivation` per executionId (not array)
- All effects from same activation share same `start` position

### 3.2 Update `getDeactivator()` Function

**Before:**

```typescript
const getDeactivator = (
  skillsSet: Map<string, SkillActivation[]>,
  _othersSet: Map<string, SkillActivation[]>,
) => {
  return (
    raceSolver: RaceSolver,
    executionId: string,
    skillId: string,
    _perspective: ISkillPerspective,
    _effectType: ISkillType,
    _effectTarget: ISkillTarget,
  ) => {
    if (['asitame', 'staminasyoubu'].includes(skillId)) {
      return;
    }

    const skillActivations = skillsSet.get(executionId);

    if (skillActivations && skillActivations.length > 0) {
      const activationPos = skillActivations[skillActivations.length - 1].start;

      if (raceSolver.pos > activationPos) {
        skillActivations[skillActivations.length - 1].end = Math.min(
          raceSolver.pos,
          course.distance,
        );
      }

      skillsSet.set(executionId, skillActivations);
    }
  };
};
```

**After:**

```typescript
const getDeactivator = (
  skillsSet: Map<string, SkillActivation>,
  othersSet: Map<string, SkillActivation>,
) => {
  return (
    raceSolver: RaceSolver,
    executionId: string,
    skillId: string,
    _perspective: ISkillPerspective,
    effectType: ISkillType,
    effectTarget: ISkillTarget,
  ) => {
    if (['asitame', 'staminasyoubu'].includes(skillId)) {
      return;
    }

    // Determine which set this effect belongs to
    const targetSet = effectTarget === SkillTarget.Self ? skillsSet : othersSet;
    const activation = targetSet.get(executionId);

    if (!activation) return;

    // Remove this specific effect from the activation
    activation.effects = activation.effects.filter(
      (e) => !(e.effectType === effectType && e.effectTarget === effectTarget),
    );

    // Update end position when last effect completes
    if (activation.effects.length === 0) {
      activation.end = Math.min(raceSolver.pos, course.distance);
    }

    targetSet.set(executionId, activation);
  };
};
```

**Key Changes:**

- Removes individual effects as they expire
- Updates `end` position when ALL effects have completed
- Handles both self and other target sets

### 3.3 Update Map Type Declarations

**Before:**

```typescript
const runnerASkillActivations: Map<string, SkillActivation[]> = new Map();
const runnerBSkillActivations: Map<string, SkillActivation[]> = new Map();
```

**After:**

```typescript
const runnerASkillActivations: Map<string, SkillActivation> = new Map();
const runnerBSkillActivations: Map<string, SkillActivation> = new Map();
```

### 3.4 Update Data Copy for SimulationRun

When copying skill data to the simulation run result:

**Before:**

```typescript
data.sk[0] = new Map(runnerASkillActivations);
data.sk[1] = new Map(runnerBSkillActivations);
```

**After (same, but types changed):**

```typescript
data.sk[0] = new Map(runnerASkillActivations);
data.sk[1] = new Map(runnerBSkillActivations);
```

The actual copying code doesn't change, but the underlying type is now `Map<string, SkillActivation>` instead of `Map<string, SkillActivation[]>`.

### 3.5 Update `SimulationRun` Type

**File:** `src/modules/simulation/compare.types.ts`

**Before:**

```typescript
export interface SimulationRun {
  // ...
  sk: [SkillActivationMap, SkillActivationMap]; // SkillActivationMap = Map<string, SkillActivation[]>
  // ...
}
```

**After (type definition changes, interface stays same):**

```typescript
export interface SimulationRun {
  // ...
  sk: [SkillActivationMap, SkillActivationMap]; // SkillActivationMap = Map<string, SkillActivation>
  // ...
}
```

### 3.6 Checklist

- [ ] Update `getActivator()` signature and implementation
- [ ] Update `getDeactivator()` signature and implementation
- [ ] Change Map type from `Map<string, SkillActivation[]>` to `Map<string, SkillActivation>`
- [ ] Update `SkillActivationMap` type alias
- [ ] Verify data copying to `SimulationRun` still works
- [ ] Test with multi-effect skills (Stamina Siphon)

---

## Phase 4: Visualization Layer

This phase updates the visualization layer to work with the new grouped effect structure.

### 4.1 Update `EffectQuery` Utility

**File:** `src/modules/skills/effects-query.ts`

**Before:**

```typescript
export class EffectQuery {
  private activations: SkillActivationMap;
  private flatList: SkillActivation[];

  private constructor(activations: SkillActivationMap) {
    this.activations = activations;
    this.flatList = Array.from(activations.values()).flat(); // Flattens arrays
  }

  static from(activations: SkillActivationMap): EffectQuery {
    return new EffectQuery(activations);
  }

  toList(): SkillActivation[] {
    return this.flatList;
  }

  getSelfBuffs(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Self &&
        a.effectTarget === SkillTarget.Self, // Single effectTarget
    );
  }

  getStaminaDebuffs(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Other &&
        a.effectTarget !== SkillTarget.Self &&
        a.effectType === SkillType.Recovery, // Single effectType
    );
  }

  // ... other methods
}
```

**After:**

```typescript
export class EffectQuery {
  private activations: SkillActivationMap;
  private flatList: SkillActivation[];

  private constructor(activations: SkillActivationMap) {
    this.activations = activations;
    // No longer need .flat() since values are not arrays
    this.flatList = Array.from(activations.values());
  }

  static from(activations: SkillActivationMap): EffectQuery {
    return new EffectQuery(activations);
  }

  toList(): SkillActivation[] {
    return this.flatList;
  }

  // Count skill activations
  countActivations(): number {
    return this.flatList.length;
  }

  // Count total effects across all activations
  countEffects(): number {
    return this.flatList.reduce((sum, skill) => sum + skill.effects.length, 0);
  }

  // Get skills that have any self-targeting effects
  getSelfBuffs(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Self &&
        a.effects.some((e) => e.effectTarget === SkillTarget.Self),
    );
  }

  // Get skills that have debuff effects (other perspective, targeting others)
  getDebuffs(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Other &&
        a.effects.some((e) => e.effectTarget !== SkillTarget.Self),
    );
  }

  // Get skills with stamina drain effects
  getStaminaDebuffs(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Other &&
        a.effects.some(
          (e) =>
            e.effectTarget !== SkillTarget.Self &&
            e.effectType === SkillType.Recovery,
        ),
    );
  }

  // Get skills with recovery effects (self heals)
  getSelfHeals(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Self &&
        a.effects.some((e) => e.effectType === SkillType.Recovery),
    );
  }

  // Get a specific activation by executionId
  getActivation(executionId: string): SkillActivation | undefined {
    return this.activations.get(executionId);
  }

  // Get skills that contain a specific effect type
  getByEffectType(effectType: ISkillType): SkillActivation[] {
    return this.flatList.filter((a) =>
      a.effects.some((e) => e.effectType === effectType),
    );
  }
}
```

**Key Changes:**

- No longer flattens nested arrays (Map values are now single activations)
- Filter methods now use `.some()` to check effect arrays
- Added `countEffects()` to count individual effects
- Added `getByEffectType()` for more granular queries

### 4.2 Update `getSkillsActivated()` Mapper

**File:** `src/modules/racetrack/hooks/useVisualizationData.ts`

**Before:**

```typescript
const getSkillsActivated = (umaIndex: number) => {
  return (activation: SkillActivation) => {
    const { start, end, effectTarget, skillId } = activation;
    const color = effectTarget === SkillTarget.Self ? colors[0] : colors[1];

    return {
      type: RegionDisplayType.Textbox,
      color: color,
      text: getSkillNameById(skillId),
      skillId: skillId,
      umaIndex: umaIndex,
      regions: [{ start, end }],
    };
  };
};
```

**After:**

```typescript
const getSkillsActivated = (umaIndex: number) => {
  return (activation: SkillActivation) => {
    const { start, end, effects, skillId } = activation;

    // Determine color based on primary effect target
    // If any effect targets self, use self color
    const hasSelfEffect = effects.some(
      (e) => e.effectTarget === SkillTarget.Self,
    );
    const color = hasSelfEffect ? colors[0] : colors[1];

    return {
      type: RegionDisplayType.Textbox,
      color: color,
      text: getSkillNameById(skillId),
      skillId: skillId,
      umaIndex: umaIndex,
      regions: [{ start, end }],
      // Optional: include effect types for tooltip display
      effectTypes: effects.map((e) => e.effectType),
    };
  };
};
```

**Notes:**

- Now checks `effects[]` array instead of single `effectTarget`
- Color determination logic may need refinement based on UI requirements
- Can optionally pass effect types for richer tooltip display

### 4.3 Update `RegionData` Type (Optional Enhancement)

**File:** `src/modules/racetrack/hooks/useVisualizationData.ts`

If you want to display effect details in tooltips:

```typescript
export type RegionData = {
  type: RegionDisplayType;
  regions: {
    start: number;
    end: number;
  }[];
  color: {
    fill: string;
    stroke: string;
  };
  text: string;
  height?: number;
  skillId?: string;
  umaIndex?: number;
  effectTypes?: ISkillType[]; // NEW: for tooltip display
};
```

### 4.4 Visualization Usage

The `useVisualizationData` hook usage remains largely unchanged:

```typescript
const skillActivations: RegionData[] = useMemo(() => {
  if (!chartData?.sk) return [];

  const mapRunnerASkills = getSkillsActivated(0);
  const runnerASkills = EffectQuery.from(chartData.sk[0])
    .toList()
    .map(mapRunnerASkills);

  const mapRunnerBSkills = getSkillsActivated(1);
  const runnerBSkills = EffectQuery.from(chartData.sk[1])
    .toList()
    .map(mapRunnerBSkills);

  return [...runnerASkills, ...runnerBSkills];
}, [chartData]);
```

This code works the same because `EffectQuery.toList()` still returns an array of `SkillActivation` objects.

### 4.5 Checklist

- [ ] Update `EffectQuery` constructor (remove `.flat()`)
- [ ] Update `getSelfBuffs()` to check `effects.some()`
- [ ] Update `getDebuffs()` to check `effects.some()`
- [ ] Update `getStaminaDebuffs()` to check `effects.some()`
- [ ] Update `getSelfHeals()` to check `effects.some()`
- [ ] Add `countEffects()` method
- [ ] Add `getByEffectType()` method
- [ ] Update `getSkillsActivated()` mapper to handle `effects[]`
- [ ] (Optional) Add `effectTypes` to `RegionData` for tooltips
- [ ] Verify timeline displays correctly

---

## Phase 5: Testing and Verification

This phase outlines the testing strategy to verify the refactoring works correctly.

### 5.1 Update Existing Test

**File:** `src/modules/simulation/lib/__tests__/RaceSolver.test.ts`

The existing test uses the old callback signature. Update it to use the new signature:

**Before:**

```typescript
solver.onSkillActivate = (
  _solver: RaceSolver,
  _executionId: string,
  skillId: string,
  _perspective: number,
  type: number,
  _target: number,
) => {
  activationCalled = true;
  activatedSkillId = skillId;
  activatedType = type;
};
```

**After:**

```typescript
solver.onSkillActivate = (
  _solver: RaceSolver,
  _executionId: string,
  skillId: string,
  _perspective: number,
  position: number,
  effects: CompactEffect[],
) => {
  activationCalled = true;
  activatedSkillId = skillId;
  activatedPosition = position;
  activatedEffects = effects;
};
```

### 5.2 Add Multi-Effect Position Test

Add a new test specifically for verifying all effects share the same position:

```typescript
test('should record all effects at the same position', () => {
  let activationPosition: number | null = null;
  let activationEffects: CompactEffect[] = [];

  solver.onSkillActivate = (
    _solver: RaceSolver,
    _executionId: string,
    _skillId: string,
    _perspective: number,
    position: number,
    effects: CompactEffect[],
  ) => {
    activationPosition = position;
    activationEffects = effects;
  };

  // Process skill activations
  solver.processSkillActivations();

  // Verify single position for all effects
  expect(activationPosition).toBe(1600); // solver.pos was set to 1600

  // Verify both effects are present
  expect(activationEffects.length).toBe(2);

  // Verify effect types
  const effectTypes = activationEffects.map((e) => e.type);
  expect(effectTypes).toContain(SkillType.Recovery);

  // Verify effect targets
  const effectTargets = activationEffects.map((e) => e.target);
  expect(effectTargets).toContain(SkillTarget.Self);
  expect(effectTargets).toContain(SkillTarget.AheadOfSelf);
});
```

### 5.3 Add Callback Count Test

Verify callback is called once per skill, not once per effect:

```typescript
test('should call onSkillActivate once per skill (not per effect)', () => {
  let callCount = 0;

  solver.onSkillActivate = (
    _solver: RaceSolver,
    _executionId: string,
    _skillId: string,
    _perspective: number,
    _position: number,
    effects: CompactEffect[],
  ) => {
    callCount++;
    // Should receive both effects in single call
    expect(effects.length).toBe(2);
  };

  solver.processSkillActivations();

  // Should only be called once (not twice for 2 effects)
  expect(callCount).toBe(1);
});
```

### 5.4 Add Duration-Based Effect Test

Test skills with duration-based effects that need active tracking:

```typescript
test('should track duration-based effects in activeSkills Map', () => {
  // Create a skill with target speed effect (duration-based)
  const speedSkill: PendingSkill = {
    skillId: 'speed_skill_test',
    perspective: SkillPerspective.Self,
    rarity: SkillRarity.Gold,
    trigger: new Region(1500, 2000),
    extraCondition: (state: RaceState) => state.phase === 1,
    effects: [
      {
        type: SkillType.TargetSpeed,
        baseDuration: 3.0, // 3 seconds base
        modifier: 0.15,
        target: SkillTarget.Self,
      },
    ],
  };

  // Create new solver with speed skill
  const speedSolver = new RaceSolver({
    horse,
    course,
    rng: new Rule30CARng(123456),
    skills: [speedSkill],
    hp: new GameHpPolicy(course, GroundCondition.Good, rng),
    skillCheckChance: false,
  });

  speedSolver.pos = 1600;
  speedSolver.phase = 1;

  speedSolver.processSkillActivations();

  // Verify skill is in activeSkills Map
  expect(speedSolver.activeSkills.size).toBe(1);

  const [executionId, activeSkill] = [...speedSolver.activeSkills.entries()][0];
  expect(activeSkill.skillId).toBe('speed_skill_test');
  expect(activeSkill.activationPosition).toBe(1600);
  expect(activeSkill.effects.length).toBe(1);
  expect(activeSkill.effects[0].effectType).toBe(SkillType.TargetSpeed);
});
```

### 5.5 Integration Test: Stamina Siphon

Create an integration test that simulates the original bug scenario:

```typescript
describe('Stamina Siphon Integration', () => {
  test('both effects should have same activation position', () => {
    // This test verifies the original bug is fixed:
    // Both Recovery effects should share the same position

    const activations: Array<{
      executionId: string;
      position: number;
      effects: CompactEffect[];
    }> = [];

    solver.onSkillActivate = (
      _solver: RaceSolver,
      executionId: string,
      _skillId: string,
      _perspective: number,
      position: number,
      effects: CompactEffect[],
    ) => {
      activations.push({ executionId, position, effects });
    };

    solver.processSkillActivations();

    // Should have exactly 1 activation (not 2)
    expect(activations.length).toBe(1);

    // All effects should have the same position
    const activation = activations[0];
    expect(activation.position).toBe(1600); // solver.pos

    // Both effects should be in the same activation
    expect(activation.effects.length).toBe(2);

    // Verify we have both the drain and heal effects
    const targets = activation.effects.map((e) => e.target);
    expect(targets).toContain(SkillTarget.Self);
    expect(targets).toContain(SkillTarget.AheadOfSelf);
  });
});
```

### 5.6 Manual Verification Steps

After implementing the refactoring:

1. **Run existing tests:**

   ```bash
   bun test src/modules/simulation/lib/__tests__/RaceSolver.test.ts
   ```

2. **Run full test suite:**

   ```bash
   bun test
   ```

3. **Manual UI testing:**
   - Open the application
   - Configure a runner with "Stamina Siphon" skill
   - Run a comparison simulation
   - Verify the skill appears as a single entry on the timeline
   - Check that the position is consistent

4. **Debug verification:**
   - Add console.log in `onSkillActivate` callback
   - Verify output shows single call with both effects
   - Example expected output:
     ```
     Skill activated: stamina_siphon
     Position: 1455.32
     Effects: [
       { type: 9, target: 9 },  // Drain opponents
       { type: 9, target: 1 }   // Heal self
     ]
     ```

### 5.7 Performance Verification

Compare performance before and after:

```typescript
// Add to test file or run manually
test('performance: callback count reduction', () => {
  let callCount = 0;

  solver.onSkillActivate = () => {
    callCount++;
  };

  // Run simulation
  while (solver.pos < course.distance) {
    solver.step();
  }

  // With new system: 1 call per skill activation
  // With old system: 1 call per effect
  console.log(`Total onSkillActivate calls: ${callCount}`);

  // Expect roughly half the calls for 2-effect skills
});
```

### 5.8 Checklist

- [ ] Update existing test callback signature
- [ ] Add multi-effect position test
- [ ] Add callback count test
- [ ] Add duration-based effect test
- [ ] Add Stamina Siphon integration test
- [ ] Run all tests and verify passing
- [ ] Perform manual UI verification
- [ ] Check performance improvement
- [ ] Document any edge cases found

---

## Summary

This migration guide covers the complete refactoring from effect-level to skill-centric tracking:

| Phase     | Description              | Estimated Time |
| --------- | ------------------------ | -------------- |
| Phase 1   | Data structure updates   | 1-2 hours      |
| Phase 2   | RaceSolver core changes  | 2-3 hours      |
| Phase 3   | Data collection updates  | 1-2 hours      |
| Phase 4   | Visualization layer      | 1 hour         |
| Phase 5   | Testing and verification | 2-3 hours      |
| **Total** |                          | **7-11 hours** |

### Key Benefits

1. **Bug Fix**: Multi-effect skills now record all effects at the same position
2. **Performance**: Single callback per skill reduces overhead by ~50% for multi-effect skills
3. **Clarity**: Data structure clearly represents skill-effect hierarchy
4. **Maintainability**: Simplified code with less duplication

### Migration Order

Execute phases in order (1 → 2 → 3 → 4 → 5) to ensure each layer builds on the previous.

Phase 1 and 2 can be tested in isolation before updating the data collection (Phase 3) and visualization (Phase 4) layers.
