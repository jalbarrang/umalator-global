---
name: RaceSolver Test Implementation
overview: Implement comprehensive unit tests for the RaceSolver core simulation engine covering initialization, physics, state machines, position keeping, and skill activation as outlined in the test plan document.
todos:
  - id: fixtures
    content: Create __test__/fixtures.ts with createRaceSolver and helper utilities
    status: completed
  - id: init-tests
    content: Implement initialization tests in RaceSolver.test.ts (constructor, hills, RNG)
    status: completed
    dependencies:
      - fixtures
  - id: physics-tests
    content: Implement physics tests in RaceSolver.speed.test.ts (speed, accel, step)
    status: completed
    dependencies:
      - fixtures
  - id: state-tests
    content: Add state machine tests (phase, rushed, downhill, last spurt)
    status: completed
    dependencies:
      - init-tests
  - id: poskeep-tests
    content: Implement position keep tests in RaceSolver.poskeep.test.ts
    status: completed
    dependencies:
      - fixtures
  - id: skill-tests
    content: Implement skill activation tests in RaceSolver.skills.test.ts
    status: completed
    dependencies:
      - fixtures
  - id: lane-tests
    content: Add lane movement tests to RaceSolver.speed.test.ts
    status: completed
    dependencies:
      - physics-tests
---

# RaceSolver Core Logic Test Implementation

## Summary

Implement ~87 unit tests for [`src/modules/simulation/lib/core/RaceSolver.ts`](src/modules/simulation/lib/core/RaceSolver.ts) following the test plan structure. The tests will be organized into separate files by functionality to maintain clarity.

## Test Structure

```javascript
src/modules/simulation/lib/core/__test__/
├── fixtures.ts              # Shared test utilities
├── RaceSolver.test.ts       # Initialization tests
├── RaceSolver.speed.test.ts # Physics/speed calculations
├── RaceSolver.skills.test.ts # Skill activation pipeline
└── RaceSolver.poskeep.test.ts # Position keeping
```



## Key Dependencies to Mock

1. **HpPolicy** - Use `NoopHpPolicy` from [`src/modules/simulation/lib/runner/health/HpPolicy.ts`](src/modules/simulation/lib/runner/health/HpPolicy.ts) for most tests
2. **PRNG** - Use `SeededRng` from [`src/modules/simulation/lib/utils/Random.ts`](src/modules/simulation/lib/utils/Random.ts) with fixed seeds
3. **Course/Horse** - Extend existing fixtures from [`src/modules/simulation/lib/skills/parser/conditions/__test__/fixtures.ts`](src/modules/simulation/lib/skills/parser/conditions/__test__/fixtures.ts)

## Critical: Slope Data Format

The actual game data uses **basis points** for slopes (10000 = 1% grade):

- `slope: 10000` = 1% uphill
- `slope: -15000` = -1.5% downhill
- RaceSolver checks `slope > 100` for significant uphills (>1.0% grade)

The existing mock fixtures use incorrect scale (`slope: 2` instead of `slope: 20000`). Our new fixtures must use the correct scale for accurate testing.

## Implementation Phases

### Phase 1: Test Fixtures

Create `fixtures.ts` with:

- `createRaceSolver()` - Factory with sensible defaults
- `advanceToPhase()` / `advanceToPosition()` - Helpers to move simulation forward
- Mock PRNG wrapper for deterministic testing
- Extend existing `createMockCourse()` and `createMockHorse()`

### Phase 2: Initialization Tests (RaceSolver.test.ts)

- Constructor tests (10 cases): starting values, baseSpeed formula, minSpeed, phase, timers
- Hill initialization tests (5 cases): slope processing, sorting validation
- RNG initialization tests (3 cases): separate streams, gateRoll, randomLot

### Phase 3: Physics Tests (RaceSolver.speed.test.ts)

- Speed calculations (6 cases): baseTargetSpeed per phase, lastSpurtSpeed, getMaxSpeed
- Acceleration calculations (4 cases): baseAccel formula with proficiency modifiers
- Step function (8 cases): position advancement, speed capping, HP tick, start dash exit

### Phase 4: State Machine Tests (in RaceSolver.test.ts)

- Phase transitions (5 cases): boundaries at 1/6 and 2/3 distance
- Last spurt state (4 cases): phase 2 requirement, HP check
- Rushed state (8 cases): chance formula, activation, recovery
- Downhill mode (5 cases): slope detection, probability, HP modifier

### Phase 5: Position Keep Tests (RaceSolver.poskeep.test.ts)

- Threshold calculations (3 cases): min/max thresholds, courseFactor
- State transitions (8 cases): PaceUp/PaceDown/SpeedUp/Overtake conditions
- Speed coefficients: SpeedUp `1.04x`, Overtake `1.05x`, PaceUp `1.04x`, PaceDown `0.915x`
- Pacemaker selection (3 cases): front runner priority, lucky pace
- Note: Tests should use Global values (no Pace Up Ex, no mid-race PaceDown lerp)

### Phase 6: Skill Tests (RaceSolver.skills.test.ts)

- Skill processing (4 cases): pending skills, trigger regions
- Skill activation (4 cases): activateCount, usedSkills set, duration scaling
- Effect application (6 cases): targetSpeed, currentSpeed, accel, HP recovery
- Skill expiration (3 cases): timer check, modifier cleanup

### Phase 7: Lane Movement Tests (in RaceSolver.speed.test.ts)

- Lane movement (5 cases): targetLane approach, blocked side handling

## Testing Patterns

Use existing test patterns from the codebase:

```typescript
import { describe, expect, test } from 'bun:test';
```



## Verified Formulas (from quick-reference.md)

### Speed Calculations

- `baseSpeed = 20.0 - (distance - 2000) / 1000`
- `minSpeed = 0.85 * baseSpeed + sqrt(200 * guts) * 0.001`
- Phase boundaries: 0 to 1/6, 1/6 to 2/3, 2/3 to end
- Last spurt: `(BaseMidRaceTargetSpeed + 0.01 * baseSpeed) * 1.05 + sqrt(500 * speed) * distProf * 0.002 + (450 * guts)^0.597 * 0.0001`

### Acceleration

- Base: `0.0006` (normal), `0.0004` (uphill)
- Start dash: `+24 m/s²`
- Phase deceleration: `[-1.2, -0.8, -1.0]` for phases 0, 1, 2

### Position Keep (Global values)

- SpeedUp: `1.04x`, Overtake: `1.05x`, PaceUp: `1.04x`
- PaceDown: `0.915x` (NOT `0.945x` - mid-race lerp not in Global)
- Note: Pace Down `-0.5 m/s²` deceleration override NOT in Global

### Rushed State

- Chance: `(6.5 / log10(0.1 * wisdom + 1))² / 100`
- HP consumption: `1.6x` modifier
- Recovery: `55%` chance every 3s, max 12s

### Downhill Mode

- Entry: `wisdom * 0.0004` chance per second
- Exit: `20%` (`0.2`) chance per second
- Speed boost: `0.3 + abs(slope / 10000) / 10` m/s (slope in basis points)
- Example: slope=-15000 (1.5% grade) -> `0.3 + 1.5/10` = `0.45` m/s
- HP consumption: `0.4x` modifier
- Only activates on downhills with >1.0% grade (`slope < -100`)

### Skill Activation

- Wit check: `max(100 - 9000 / wisdom, 20) * 0.01`
- Green skills and Unique rarity bypass wit check

## Estimated Scope