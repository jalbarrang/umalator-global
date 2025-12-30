# Test Plan: RaceSolver Core Logic

## Overview

This plan covers unit tests for the core race simulation engine (`RaceSolver`), which orchestrates:
- Race state progression (position, speed, acceleration)
- Phase transitions
- Skill activation pipeline
- Position keeping mechanics
- Special states (rushed, downhill mode, etc.)

## Files Under Test

| File | Lines | Priority |
|------|-------|----------|
| `src/modules/simulation/lib/core/RaceSolver.ts` | ~1900 | High |

## Test File Location

```
src/modules/simulation/lib/core/__test__/
├── RaceSolver.test.ts
├── RaceSolver.speed.test.ts
├── RaceSolver.skills.test.ts
├── RaceSolver.poskeep.test.ts
└── fixtures.ts
```

---

## Part 1: Initialization Tests

### 1.1 Constructor

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `initializes with correct starting position` | pos = 0 | pos === 0 |
| `initializes with correct starting speed` | currentSpeed = 3.0 | currentSpeed === 3.0 |
| `calculates baseSpeed from course distance` | Formula: `20.0 - (distance - 2000) / 1000.0` | Correct baseSpeed |
| `calculates minSpeed with guts` | `0.85 * baseSpeed + sqrt(200 * guts) * 0.001` | Correct minSpeed |
| `initializes phase to 0` | Starting phase | phase === 0 |
| `calculates start delay from RNG` | `0.1 * rng.random()` | Delay in [0, 0.1) |
| `applies start dash accel modifier (+24)` | Boost at start | modifier.accel includes 24 |
| `initializes all timers` | Timer array populated | timers.length > 0 |
| `clones horse parameters` | Mutations don't affect original | horse !== params.horse |
| `clones pending skills` | Mutations don't affect original | Deep copy verified |

### 1.2 Hill Initialization

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `initHills populates hillStart and hillEnd` | Slopes exist | Arrays populated |
| `initHills reverses slope order` | For sequential processing | Reversed correctly |
| `initHills handles course with no slopes` | Flat course | Empty arrays |
| `initHills throws if slopes not sorted` | Invalid data | Error thrown |
| `initHills filters slopes by grade threshold` | Only >1% uphills | Correct filtering |

### 1.3 RNG Initialization

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `creates separate RNG streams` | syncRng, gorosiRng, etc. | All different seeds |
| `gateRoll is uniform mod 12252240` | For post_number | In valid range |
| `randomLot is uniform mod 100` | For random_lot condition | In [0, 100) |

---

## Part 2: Physics / Movement Tests

### 2.1 Speed Calculations

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `baseTargetSpeed formula correct for phase 0` | Early race | Matches formula |
| `baseTargetSpeed formula correct for phase 1` | Mid race | Matches formula |
| `baseTargetSpeed formula correct for phase 2` | Late race (includes speed stat) | Matches formula |
| `lastSpurtSpeed includes guts component` | Spurt calculation | Matches formula |
| `getMaxSpeed respects start dash limit` | During start dash | Capped at 0.85 * baseSpeed |
| `getMaxSpeed allows deceleration` | When currentSpeed > targetSpeed | Returns 9999 |

### 2.2 Acceleration Calculations

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `baseAccel formula correct` | Standard case | Matches formula |
| `baseAccel uses uphill base when on slope` | On uphill | Uses 0.0004 base |
| `baseAccel applies strategy coefficient` | Per-phase | Correct multiplier |
| `baseAccel applies proficiency modifiers` | Surface/distance | Correct multipliers |

### 2.3 Step Function

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `step advances position by velocity * dt` | Basic movement | pos increases |
| `step caps speed at maxSpeed` | Cannot exceed target | speed <= maxSpeed |
| `step respects minSpeed floor` | After start dash | speed >= minSpeed |
| `step handles start delay` | First frames | No movement during delay |
| `step calls HP tick` | Stamina consumption | hp.tick called |
| `step updates all timers` | Time tracking | Timers advance by dt |
| `step exits start dash when speed threshold met` | Transition | startDash becomes false |
| `step removes start dash accel modifier` | On exit | -24 accel modifier |

---

## Part 3: Phase Transition Tests

### 3.1 Phase Updates

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `updatePhase transitions at correct positions` | Phase boundaries | Phase increments |
| `updatePhase sets nextPhaseTransition` | After transition | New boundary set |
| `phase 0 to 1 transition` | At 1/6 distance | phase becomes 1 |
| `phase 1 to 2 transition` | At 2/3 distance | phase becomes 2 |
| `phase stays at 2 after final transition` | End of race | No further change |

### 3.2 Last Spurt State

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `updateLastSpurtState sets isLastSpurt` | When conditions met | Flag set true |
| `isLastSpurt requires phase 2` | Early phases | Not set |
| `isLastSpurt triggers spurt speed calculation` | HP check | getLastSpurtPair called |
| `lastSpurtTransition tracks activation position` | For charting | Position recorded |

---

## Part 4: Rushed State Tests

### 4.1 Rushed Initialization

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `initRushedState calculates chance from wisdom` | Formula: `(6.5 / log10(0.1*wiz+1))² / 100` | Correct probability |
| `initRushedState applies The Restraint reduction` | Skill 202161 present | -3% chance |
| `initRushedState determines section 2-9` | When triggered | Section in range |
| `initRushedState skips when disabled` | Flag set | No rushed state |

### 4.2 Rushed Updates

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `updateRushedState activates at section position` | Reaching threshold | isRushed = true |
| `updateRushedState can only activate once` | hasBeenRushed flag | No re-activation |
| `updateRushedState checks recovery every 3s` | Timer check | Recovery attempts |
| `updateRushedState has 55% recovery chance` | Per attempt | Probabilistic exit |
| `updateRushedState force-ends at max duration` | 12 seconds | Always exits |
| `endRushedState records position for UI` | Tracking | rushedActivations updated |

---

## Part 5: Downhill Mode Tests

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `updateDownhillMode activates on downhill` | Slope detection | isDownhillMode = true |
| `updateDownhillMode respects probability` | RNG check | Not always active |
| `updateDownhillMode deactivates when leaving` | Position check | isDownhillMode = false |
| `updateDownhillMode skips when disabled` | Flag set | Never activates |
| `downhill affects HP consumption` | Via status modifier | 0.4x consumption |

---

## Part 6: Position Keep Tests

### 6.1 Threshold Calculations

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `posKeepMinThreshold formula correct` | Per strategy/distance | Matches formula |
| `posKeepMaxThreshold formula correct` | Per strategy/distance | Matches formula |
| `courseFactor formula correct` | Distance scaling | Matches formula |

### 6.2 State Transitions

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `applyPositionKeepStates triggers PaceUp` | Behind > maxThreshold | State changes |
| `applyPositionKeepStates triggers PaceDown` | Behind < minThreshold | State changes |
| `applyPositionKeepStates triggers SpeedUp` | Front runner conditions | State changes |
| `applyPositionKeepStates triggers Overtake` | Non-leader front runner | State changes |
| `position keep ends at section boundary` | Exit condition | State = None |
| `position keep respects wisdom checks` | RNG-based | Probabilistic |
| `position keep skips when mode is None` | Mode check | No state changes |
| `position keep ends at posKeepEnd position` | Distance limit | State = None |

### 6.3 Pacemaker Selection

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `getPacer returns front runner if exists` | Standard case | Furthest front runner |
| `getPacer handles no front runners` | Lucky pace | Next strategy up |
| `getPacer sets pacerOverride` | Lucky pace case | Flag set |

---

## Part 7: Skill Activation Tests

### 7.1 Skill Processing

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `processSkillActivations checks pending skills` | Each step | Skills evaluated |
| `processSkillActivations respects trigger regions` | Position check | Only activates in region |
| `processSkillActivations calls extraCondition` | Dynamic conditions | Condition checked |
| `processSkillActivations respects wisdom check` | skillCheckChance | Probabilistic |

### 7.2 Skill Activation

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `activateSkill increments activateCount` | Per phase | Count increases |
| `activateSkill adds to usedSkills set` | Tracking | Skill ID added |
| `activateSkill calls onSkillActivate callback` | Hook | Callback invoked |
| `activateSkill sorts effects (ExtendEvolvedDuration last)` | Type 42 | Correct order |
| `activateSkill calculates scaled duration` | Distance factor | Duration scaled |

### 7.3 Effect Application

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `applyEffect handles target speed modifier` | Type check | Modifier applied |
| `applyEffect handles current speed modifier` | Type check | Modifier applied |
| `applyEffect handles acceleration modifier` | Type check | Modifier applied |
| `applyEffect handles HP recovery` | Type check | HP restored |
| `applyEffect handles stat modifications` | Green skills | Stats changed |
| `applyEffect creates duration timer` | Timed effects | Timer started |

### 7.4 Skill Expiration

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `expired skills removed from active lists` | Timer check | Skill removed |
| `onSkillDeactivate called on expiration` | Hook | Callback invoked |
| `modifier removed on skill expiration` | Cleanup | Modifier subtracted |

---

## Part 8: Lane Movement Tests

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `applyLaneMovement moves toward targetLane` | Lane change | currentLane approaches target |
| `applyLaneMovement respects acceleration limit` | Per frame | Limited change |
| `applyLaneMovement handles blocked side` | Condition check | No inward movement |
| `applyLaneMovement handles overtake` | Condition check | Moves outward |
| `applyLaneMovement calculates extraMoveLane` | Final stretch | Random component |

---

## Test Fixtures Required

```typescript
// fixtures.ts

export function createMockHorse(overrides?: Partial<HorseParameters>): HorseParameters;
export function createMockCourse(overrides?: Partial<CourseData>): CourseData;
export function createMockHpPolicy(): HpPolicy;
export function createMockPRNG(seed?: number): PRNG;
export function createMockSkill(overrides?: Partial<PendingSkill>): PendingSkill;
export function createRaceSolver(overrides?: Partial<RaceSolverParams>): RaceSolver;

// Test helpers
export function advanceToPhase(solver: RaceSolver, phase: number): void;
export function advanceToPosition(solver: RaceSolver, pos: number): void;
```

---

## Implementation Notes

### Testing Strategy

1. **Isolate dependencies** - Mock HpPolicy, PRNG to control behavior
2. **Use deterministic seeds** - Same seed = same results
3. **Test in isolation** - Each subsystem tested independently first
4. **State verification** - Check internal state, not just return values

### Complex Areas

1. **Skill activation pipeline** - Many interdependent parts
2. **Position keeping** - Requires pacer/multi-uma context
3. **RNG streams** - Multiple separate streams, order matters

### Suggested Test Order

1. Constructor / initialization (foundation)
2. Physics calculations (pure functions)
3. Phase transitions (state machine)
4. Rushed/downhill states (isolated subsystems)
5. Position keeping (requires pacer mock)
6. Skill activation (most complex)

---

## Estimated Effort

| Section | Test Count | Complexity | Time Estimate |
|---------|------------|------------|---------------|
| Initialization | 13 | Medium | 2 hours |
| Physics/Speed | 10 | Medium | 2 hours |
| Step Function | 8 | High | 2 hours |
| Phase Transitions | 8 | Low | 1 hour |
| Rushed State | 8 | Medium | 1.5 hours |
| Downhill Mode | 5 | Low | 1 hour |
| Position Keep | 12 | High | 3 hours |
| Skill Activation | 12 | High | 4 hours |
| Effect Application | 6 | Medium | 1.5 hours |
| Lane Movement | 5 | Medium | 1 hour |
| **Total** | **87** | - | **~19 hours** |

---

## Success Criteria

- [ ] All 87+ test cases pass
- [ ] Core physics formulas verified against documentation
- [ ] State machine transitions tested exhaustively
- [ ] Skill activation lifecycle fully covered
- [ ] Determinism verified across all RNG-dependent code
- [ ] No regressions in existing functionality

