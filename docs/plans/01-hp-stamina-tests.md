# Test Plan: HP/Stamina System

## Overview

This plan covers unit tests for the HP/Stamina management system, which is critical for:
- Determining when horses enter "last spurt" phase
- Calculating optimal spurt speeds
- Tracking stamina consumption throughout the race
- Handling recovery effects from skills

## Files Under Test

| File | Lines | Priority |
|------|-------|----------|
| `src/modules/simulation/lib/runner/health/HpPolicy.ts` | ~223 | High |
| `src/modules/simulation/lib/runner/health/EnhancedHpPolicy.ts` | ~449 | High |

## Test File Location

```
src/modules/simulation/lib/runner/health/__test__/
├── HpPolicy.test.ts
├── EnhancedHpPolicy.test.ts
└── fixtures.ts
```

---

## Part 1: GameHpPolicy Tests

### 1.1 Initialization

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `init sets maxHp correctly` | Verify HP formula: `0.8 * HpStrategyCoefficient[strategy] * stamina + distance` | maxHp matches formula |
| `init sets hp to maxHp` | After init, hp should equal maxHp | hp === maxHp |
| `init calculates gutsModifier` | Formula: `1.0 + 200.0 / sqrt(600.0 * guts)` | gutsModifier matches |
| `init calculates subparAcceptChance` | Formula: `round((15.0 + 0.05 * wisdom) * 1000)` | Value matches |
| `constructor sets baseSpeed` | Formula: `20.0 - (distance - 2000) / 1000.0` | baseSpeed matches |
| `constructor sets groundModifier` | Uses `HpConsumptionGroundModifier[surface][ground]` | Correct modifier |

### 1.2 HP Consumption (tick)

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `tick reduces HP by consumption rate` | HP decreases each tick | hp decreases |
| `tick uses correct velocity-based formula` | `(20 * (v - baseSpeed + 12)² / 144) * modifiers` | Consumption matches |
| `tick applies guts modifier only in phase 2+` | gutsModifier only applies late race | Different consumption rates |
| `tick applies ground modifier` | Ground condition affects consumption | Correct scaling |

### 1.3 Status Modifiers

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `getStatusModifier returns 1.0 for default state` | No special conditions | modifier === 1.0 |
| `getStatusModifier applies downhill modifier (0.4)` | isDownhillMode = true | modifier === 0.4 |
| `getStatusModifier applies rushed modifier (1.6)` | isRushed = true | modifier === 1.6 |
| `getStatusModifier applies paceDown modifier (0.6)` | positionKeepState = PaceDown | modifier === 0.6 |
| `getStatusModifier stacks modifiers correctly` | Multiple conditions active | Modifiers multiply |
| `getStatusModifier handles lead competition` | leadCompetition with various strategies | Correct multipliers |

### 1.4 Recovery

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `recover increases HP by modifier * maxHp` | Standard recovery | HP increases correctly |
| `recover caps HP at maxHp` | Cannot exceed maximum | hp <= maxHp |
| `recover handles negative HP before recovery` | Edge case | HP recovers from zero |

### 1.5 HP Status Checks

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `hasRemainingHp returns true when hp > 0` | Positive HP | true |
| `hasRemainingHp returns false when hp <= 0` | Zero or negative HP | false |
| `hpRatioRemaining returns correct ratio` | hp / maxHp | Correct percentage |
| `hpRatioRemaining clamps to 0 minimum` | Negative HP case | Returns 0, not negative |

### 1.6 Last Spurt Calculation

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `getLastSpurtPair returns max speed when HP sufficient` | Enough stamina | [-1, maxSpeed] |
| `getLastSpurtPair calculates suboptimal speeds` | Not enough for max | Returns slower speed |
| `getLastSpurtPair uses wisdom-based acceptance` | Random selection | Follows probability |
| `getLastSpurtPair consumes exactly one RNG call` | Determinism check | Single RNG consumption |
| `isMaxSpurt returns true after achieving max spurt` | Flag tracking | Correct state |

---

## Part 2: EnhancedHpPolicy Tests

### 2.1 Initialization (extends GameHpPolicy tests)

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `init calculates baseTargetSpeed2` | Phase 2 target speed | Matches formula |
| `init calculates maxSpurtSpeed` | Maximum possible speed | Matches formula |
| `init resets spurt tracking flags` | Clean slate each race | Flags reset |

### 2.2 Spurt Distance Calculation

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `calcSpurtDistance returns correct distance` | Given speed and HP | Distance matches formula |
| `calcSpurtDistance handles edge cases` | Very low/high HP | No crashes, valid output |

### 2.3 Required HP Calculation

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `calcRequiredHp for given velocity` | Standard case | HP requirement matches |
| `calcRequiredHp applies guts modifier in spurt` | spurtPhase = true | Modifier applied |
| `calcRequiredHp respects status modifier flag` | applyStatusModifier param | Correct behavior |

### 2.4 Enhanced Spurt Selection

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `getLastSpurtPair caches result` | Called multiple times | Same result, no recalc |
| `getLastSpurtPair generates speed candidates` | Suboptimal case | Candidates from v3 to max |
| `getLastSpurtPair sorts by completion time` | Optimization | Fastest first |
| `getLastSpurtPair only sets maxSpurt on first calc` | Tracking flag | Not modified on recalc |

### 2.5 Accuracy Mode (recalculateOnHeal)

| Test Case | Description | Expected Behavior |
|-----------|-------------|-------------------|
| `recover triggers recalculation in phase 2+` | Accuracy mode on | New spurt params |
| `recover does not recalculate in phase 0/1` | Early race heal | No recalculation |
| `recover does not recalculate when mode off` | Default mode | No recalculation |
| `getRecalculationCount tracks recalcs` | Multiple heals | Correct count |

---

## Test Fixtures Required

```typescript
// fixtures.ts

export function createMockCourseForHp(overrides?: Partial<CourseData>): CourseData;
export function createMockHorseForHp(overrides?: Partial<HorseParameters>): HorseParameters;
export function createMockRaceState(overrides?: Partial<RaceState>): RaceState;
export function createMockPRNG(sequence?: number[]): PRNG;
```

---

## Implementation Notes

### Dependencies to Mock

- `PRNG` - Use a deterministic mock that returns predefined sequences
- `CourseData` - Minimal mock with distance, surface, slopes
- `RaceState` - Interface mock with required properties

### Edge Cases to Cover

1. **Zero stamina** - What happens when stamina stat is very low?
2. **Maximum stamina** - Very high stamina edge case
3. **Short vs long courses** - Distance affects all calculations
4. **All ground conditions** - Each surface/condition combo
5. **All strategies** - Different HpStrategyCoefficient values

### Determinism Verification

Each test involving RNG should:
1. Use a seeded mock PRNG
2. Verify the same inputs produce the same outputs
3. Count RNG calls to ensure consistency

---

## Estimated Effort

| Section | Test Count | Complexity | Time Estimate |
|---------|------------|------------|---------------|
| GameHpPolicy Init | 6 | Low | 1 hour |
| GameHpPolicy Tick | 4 | Medium | 1 hour |
| GameHpPolicy Status | 6 | Low | 30 min |
| GameHpPolicy Recovery | 3 | Low | 30 min |
| GameHpPolicy Checks | 4 | Low | 30 min |
| GameHpPolicy Spurt | 5 | High | 2 hours |
| EnhancedHpPolicy Init | 3 | Medium | 1 hour |
| EnhancedHpPolicy Calc | 4 | High | 1.5 hours |
| EnhancedHpPolicy Spurt | 4 | High | 1.5 hours |
| EnhancedHpPolicy Accuracy | 4 | Medium | 1 hour |
| **Total** | **43** | - | **~10 hours** |

---

## Success Criteria

- [ ] All 43+ test cases pass
- [ ] No uncovered public methods
- [ ] Edge cases documented and tested
- [ ] Determinism verified for RNG-dependent code

