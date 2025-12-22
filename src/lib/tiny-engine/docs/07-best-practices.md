# Best Practices

Design principles and conventions for building robust, maintainable simulations.

## Architecture Decisions

### When to Use a Behavior vs Entity

**Use Entity when**:

- It has identity (needs an ID)
- It's a "thing" in your simulation (runner, projectile, power-up)
- Multiple instances will exist
- It needs to be managed by the engine

**Use Behavior when**:

- It's a capability or aspect (movement, health, AI)
- It's reusable across entity types
- It has focused responsibility
- It needs to execute each tick

```typescript
// ✅ Good: Clear separation
class Runner extends Entity {
  // Thing with identity
  constructor(id: string) {
    super(id);
    this.addBehavior(new MovementBehavior()); // Capability
    this.addBehavior(new HealthBehavior()); // Capability
  }
}

// ❌ Bad: Confused responsibility
class MovementEntity extends Entity {
  // Movement isn't a "thing"
  // ...
}
```

### How to Structure Complex Systems

Break complexity into layers:

```typescript
// Layer 1: Low-level physics (priority: 0-20)
class AccelerationBehavior extends Behavior {
  priority = 0;
}
class VelocityBehavior extends Behavior {
  priority = 5;
}
class PositionBehavior extends Behavior {
  priority = 10;
}

// Layer 2: Game logic (priority: 20-50)
class SkillBehavior extends Behavior {
  priority = 25;
}
class AIBehavior extends Behavior {
  priority = 30;
}
class CollisionBehavior extends Behavior {
  priority = 35;
}

// Layer 3: Resource management (priority: 50-80)
class StaminaBehavior extends Behavior {
  priority = 55;
}
class CooldownBehavior extends Behavior {
  priority = 60;
}

// Layer 4: Validation & effects (priority: 80-100)
class BoundaryBehavior extends Behavior {
  priority = 85;
}
class EffectApplierBehavior extends Behavior {
  priority = 90;
}
```

**Principle**: Lower layers provide data, higher layers consume it.

## Communication Guidelines

### Event vs Direct Communication

**Use direct communication** (`getBehavior()`) when:

- Same entity
- Tight coupling is acceptable
- Performance critical path
- Simple data access

```typescript
class StaminaBehavior extends Behavior {
  override onUpdate(dt: number): void {
    // Direct: Fast and simple
    const movement = this.owner?.getBehavior(MovementBehavior);
    this.consumeHP(movement?.currentSpeed || 0, dt);
  }
}
```

**Use events** when:

- Cross-entity communication
- One-to-many relationships
- Loose coupling desired
- Optional subscribers

```typescript
class SkillBehavior extends Behavior {
  override onUpdate(): void {
    // Events: Flexible and decoupled
    this.owner?.engine?.eventBus.emit('skill:aoe', {
      sourceId: this.owner.id,
      radius: 50,
    });
    // Don't care who's listening!
  }
}
```

### Event Granularity

Find the right balance:

```typescript
// ❌ Too granular: Event storm
override onUpdate(dt: number): void {
  this.owner?.engine?.eventBus.emit('position:x', this.x);
  this.owner?.engine?.eventBus.emit('position:y', this.y);
  this.owner?.engine?.eventBus.emit('position:z', this.z);
  // 3 events per entity per tick!
}

// ❌ Too coarse: Unnecessary data
override onUpdate(dt: number): void {
  this.owner?.engine?.eventBus.emit('entity:fullState', {
    position: {...},
    velocity: {...},
    health: {...},
    skills: {...},
    // Everything! Most listeners don't need this
  });
}

// ✅ Just right: Meaningful events
override onUpdate(): void {
  if (this.positionChanged) {
    this.owner?.engine?.eventBus.emit('runner:moved', {
      id: this.owner.id,
      position: this.position,
    });
  }
}
```

## Testing Strategies

### Test Behaviors in Isolation

```typescript
describe('MovementBehavior', () => {
  it('should update position', () => {
    const entity = new Entity('test');
    const movement = new MovementBehavior();
    movement.velocity = 10;

    entity.addBehavior(movement);
    entity.update(0.1);

    expect(movement.position).toBe(1.0);
  });
});
```

### Test Integration Scenarios

```typescript
describe('Runner System', () => {
  it('should handle complete race tick', () => {
    const engine = new GameEngine();
    const runner = new Runner('test', params);

    engine.addEntity(runner);
    engine.tick(0.0666);

    // Verify all behaviors executed correctly
    const movement = runner.getBehavior(MovementBehavior);
    const stamina = runner.getBehavior(StaminaBehavior);

    expect(movement?.position).toBeGreaterThan(0);
    expect(stamina?.hp).toBeLessThan(stamina?.maxHp);
  });
});
```

### Test Determinism

```typescript
describe('Monte Carlo', () => {
  it('should be deterministic with same seed', () => {
    const results = [];

    for (let i = 0; i < 10; i++) {
      const engine = new GameEngine();
      const rng = new SeededRng(12345);
      const runner = createRunner(rng);

      engine.addEntity(runner);
      engine.run(1.0, 0.0666);

      const movement = runner.getBehavior(MovementBehavior);
      results.push(movement?.position);
    }

    // All should be identical
    expect(new Set(results).size).toBe(1);
  });
});
```

## Determinism Checklist

For Monte Carlo simulations, verify:

- ✅ **No `Math.random()`** - Use seeded RNG passed to behaviors
- ✅ **No `Date.now()`** - Use `engine.time` for time
- ✅ **No async operations** - Everything synchronous
- ✅ **Stable iteration order** - Entities added in same order
- ✅ **Seeded initialization** - RNG for random skill placement, etc.
- ✅ **Event handlers synchronous** - EventEmitter3 guarantees this

```typescript
// ✅ Deterministic
class RandomBehavior extends Behavior {
  constructor(private rng: PRNG) {
    super();
  }

  override onUpdate(): void {
    const roll = this.rng.random(); // Seeded!
    if (roll < 0.5) {
      this.doSomething();
    }
  }
}

// ❌ Non-deterministic
class RandomBehavior extends Behavior {
  override onUpdate(): void {
    const roll = Math.random(); // Different each run!
    if (roll < 0.5) {
      this.doSomething();
    }
  }
}
```

## Performance Considerations

### Minimize Behavior Count

```typescript
// ❌ Overkill: Too many behaviors
class Runner extends Entity {
  constructor() {
    super('runner');
    this.addBehavior(new XPositionBehavior());
    this.addBehavior(new YPositionBehavior());
    this.addBehavior(new ZPositionBehavior());
    this.addBehavior(new XVelocityBehavior());
    this.addBehavior(new YVelocityBehavior());
    // 50+ micro-behaviors...
  }
}

// ✅ Better: Cohesive behaviors
class Runner extends Entity {
  constructor() {
    super('runner');
    this.addBehavior(new PositionBehavior()); // Handles x,y,z
    this.addBehavior(new VelocityBehavior()); // Handles all velocity
  }
}
```

**Guideline**: Aim for 5-15 behaviors per entity. Too few = god objects. Too many = overhead.

### Cache Expensive Lookups

```typescript
class OptimizedBehavior extends Behavior {
  private movementBehavior?: MovementBehavior;

  override onAttach(owner: Entity): void {
    super.onAttach(owner);
    // Cache the reference
    this.movementBehavior = owner.getBehavior(MovementBehavior);
  }

  override onUpdate(dt: number): void {
    // Use cached reference (no lookup every tick)
    if (this.movementBehavior) {
      this.process(this.movementBehavior.position);
    }
  }
}
```

### Disable Unused Behaviors

```typescript
class ConditionalBehavior extends Behavior {
  override onUpdate(): void {
    // Check if we're still needed
    if (this.taskCompleted) {
      this.enabled = false; // Stop updating
    }
  }
}
```

## Common Anti-Patterns

### Anti-Pattern 1: God Entity

```typescript
// ❌ Entity doing too much
class GameManager extends Entity {
  constructor() {
    super('game-manager');
    // Manages EVERYTHING
    this.addBehavior(new PhysicsBehavior());
    this.addBehavior(new RenderBehavior());
    this.addBehavior(new InputBehavior());
    this.addBehavior(new AIBehavior());
    this.addBehavior(new ScoreBehavior());
    // 30 more behaviors...
  }
}

// ✅ Better: Split responsibilities
class RaceSimulator extends Entity {
  /* Race-level only */
}
class Runner extends Entity {
  /* Runner-specific only */
}
class UIManager extends Entity {
  /* UI-specific only */
}
```

### Anti-Pattern 2: Behavior Reaching Too Far

```typescript
// ❌ Behavior knows too much about other entities
class AIBehavior extends Behavior {
  override onUpdate(): void {
    const allRunners = this.owner?.engine?.getEntities();
    for (const runner of allRunners || []) {
      const movement = runner.getBehavior(MovementBehavior);
      // Modifying other entities' behaviors directly
      movement!.velocity = 0; // Too invasive!
    }
  }
}

// ✅ Better: Use events
class AIBehavior extends Behavior {
  override onUpdate(): void {
    this.owner?.engine?.eventBus.emit('ai:blockRequest', {
      targetId: nearestOpponent,
    });
    // Let the target decide how to react
  }
}
```

### Anti-Pattern 3: Circular Dependencies

```typescript
// ❌ Behaviors depend on each other's updates
class BehaviorA extends Behavior {
  priority = 0;
  override onUpdate(): void {
    const b = this.owner?.getBehavior(BehaviorB);
    this.value = b!.value * 2; // Depends on B
  }
}

class BehaviorB extends Behavior {
  priority = 10;
  override onUpdate(): void {
    const a = this.owner?.getBehavior(BehaviorA);
    this.value = a!.value + 1; // Depends on A
  }
}
// Who runs first? Circular!

// ✅ Better: Clear data flow
class InputBehavior extends Behavior {
  priority = 0;
  rawValue = 10;
  override onUpdate(): void {
    // Produces data
  }
}

class ProcessorBehavior extends Behavior {
  priority = 10;
  override onUpdate(): void {
    const input = this.owner?.getBehavior(InputBehavior);
    this.processedValue = input!.rawValue * 2; // Consumes data
  }
}
```

### Anti-Pattern 4: Stateless Entity

```typescript
// ❌ Entity with no state
class EmptyRunner extends Entity {
  constructor() {
    super('runner');
    // No behaviors? Why is this an entity?
  }
}

// ✅ Entities should have behaviors
class Runner extends Entity {
  constructor() {
    super('runner');
    this.addBehavior(new MovementBehavior());
    this.addBehavior(new StaminaBehavior());
    // Actually does something!
  }
}
```

## Naming Conventions

### Behaviors

```typescript
// ✅ Use descriptive -Behavior suffix
class MovementBehavior extends Behavior {}
class StaminaBehavior extends Behavior {}
class SkillActivationBehavior extends Behavior {}

// ✅ Or descriptive action names
class MoveOnTrack extends Behavior {}
class ConsumeStamina extends Behavior {}
class ActivateSkills extends Behavior {}

// ❌ Avoid generic names
class UpdateBehavior extends Behavior {}
class GameBehavior extends Behavior {}
```

### Entities

```typescript
// ✅ Use noun names (things)
class Runner extends Entity {}
class RaceSimulator extends Entity {}
class PowerUp extends Entity {}

// ❌ Avoid verb names
class Running extends Entity {}
class Simulating extends Entity {}
```

### Events

```typescript
// ✅ Use namespace:action pattern
'race:phaseChanged';
'runner:finished';
'skill:activated';
'collision:detected';

// ✅ Past tense for completed actions
'entity:added';
'simulation:ended';
'milestone:reached';

// ❌ Avoid generic names
'update';
'change';
'tick';
```

## Code Organization

### File Structure

```
simulation/
├── engine/                     # Tiny Engine (game-agnostic)
│   ├── GameEngine.ts
│   ├── Entity.ts
│   └── Behavior.ts
│
├── racing/                     # Racing domain
│   ├── Runner.ts               # Runner entity
│   ├── RaceSimulator.ts        # Race orchestrator
│   │
│   ├── behaviors/
│   │   ├── runner/
│   │   │   ├── MovementBehavior.ts
│   │   │   ├── StaminaBehavior.ts
│   │   │   ├── SkillBehavior.ts
│   │   │   └── LaneBehavior.ts
│   │   │
│   │   └── race/
│   │       ├── PhaseTransitionBehavior.ts
│   │       └── PacemakerBehavior.ts
│   │
│   └── events/
│       └── RaceEvents.ts       # Event type definitions
```

### Behavior Organization

Group related behaviors:

```typescript
// behaviors/runner/physics/
export class AccelerationBehavior extends Behavior {}
export class VelocityBehavior extends Behavior {}
export class PositionBehavior extends Behavior {}

// behaviors/runner/resources/
export class StaminaBehavior extends Behavior {}
export class HealthBehavior extends Behavior {}

// behaviors/runner/gameplay/
export class SkillBehavior extends Behavior {}
export class AIBehavior extends Behavior {}
```

## Memory Management

### Clean Up Event Listeners

```typescript
class PropertyBehavior extends Behavior {
  private handlers: Array<() => void> = [];

  protected subscribe(event: string, handler: Function): void {
    this.owner?.engine?.eventBus.on(event, handler as any);
    this.handlers.push(() => {
      this.owner?.engine?.eventBus.off(event, handler as any);
    });
  }

  override onDetach(): void {
    // Clean up all subscriptions
    for (const unsubscribe of this.handlers) {
      unsubscribe();
    }
    this.handlers = [];
    super.onDetach();
  }
}
```

### Remove Entities When Done

```typescript
class ProjectileBehavior extends Behavior {
  lifetime = 0;
  maxLifetime = 5.0;

  override onUpdate(dt: number): void {
    this.lifetime += dt;

    if (this.lifetime >= this.maxLifetime) {
      // Clean up
      this.owner?.engine?.removeEntity(this.owner);
    }
  }
}
```

## Error Handling

### Graceful Degradation

```typescript
class RobustBehavior extends Behavior {
  override onUpdate(dt: number): void {
    try {
      this.riskyOperation();
    } catch (error) {
      // Log but don't crash
      console.error(`Error in ${this.constructor.name}:`, error);

      // Emit error event for monitoring
      this.owner?.engine?.eventBus.emit('behavior:error', {
        entity: this.owner?.id,
        behavior: this.constructor.name,
        error: error instanceof Error ? error.message : String(error),
      });

      // Use safe fallback
      this.useSafeDefault();
    }
  }
}
```

### Validate Dependencies

```typescript
class DependentBehavior extends Behavior {
  override onUpdate(dt: number): void {
    // Validate required behaviors exist
    const movement = this.owner?.getBehavior(MovementBehavior);
    if (!movement) {
      console.warn(`${this.owner?.id} missing MovementBehavior`);
      return;
    }

    // Safe to proceed
    this.process(movement);
  }
}
```

## Documentation

### Document Complex Behaviors

```typescript
/**
 * LastSpurtBehavior calculates optimal sprint speed for the final stretch.
 *
 * Calculation happens at the start of mid-race (Phase 1) and uses the formula:
 *
 * MaxSpeed = (BaseTargetSpeed + 0.01 * BaseSpeed) * 1.05
 *          + sqrt(500 * SpeedStat) * DistMod * 0.002
 *          + pow(450 * GutsStat, 0.597) * 0.0001
 *
 * Recalculates when:
 * - HP recovery skills activate after entering late-race
 *
 * Does NOT recalculate on:
 * - Stamina drain debuffs
 *
 * @see docs/race-mechanics.md#last-spurt-calculation
 */
class LastSpurtBehavior extends Behavior {
  // ...
}
```

### Comment the "Why"

```typescript
class SkillBehavior extends Behavior {
  override onUpdate(): void {
    // Process skills in ID order (game requirement)
    // Lower IDs can trigger higher IDs on same frame
    this.pendingSkills.sort((a, b) => a.skillId.localeCompare(b.skillId));

    for (const skill of this.pendingSkills) {
      // ...
    }
  }
}
```

## Debugging Tips

### Add Debug Behaviors

```typescript
class DebugMovementBehavior extends Behavior {
  priority = 1000; // Run last
  enabled = false; // Off by default

  override onUpdate(): void {
    const movement = this.owner?.getBehavior(MovementBehavior);
    console.log({
      time: this.owner?.engine?.time,
      position: movement?.position,
      velocity: movement?.velocity,
      acceleration: movement?.acceleration,
    });
  }
}

// Toggle via debugger or condition
if (process.env.DEBUG) {
  runner.getBehavior(DebugMovementBehavior)!.enabled = true;
}
```

### Use Meaningful IDs

```typescript
// ✅ Descriptive IDs help debugging
const runner1 = new Entity('silence-suzuka');
const runner2 = new Entity('special-week');
const race = new Entity('japan-cup-2024');

// ❌ Generic IDs are harder to debug
const runner1 = new Entity('entity-1');
const runner2 = new Entity('entity-2');
```

### Add Assertions

```typescript
class ValidatedBehavior extends Behavior {
  override onUpdate(dt: number): void {
    // Assert preconditions in development
    if (process.env.NODE_ENV === 'development') {
      console.assert(dt > 0, 'dt must be positive');
      console.assert(dt < 1, 'dt seems too large');
      console.assert(this.owner !== null, 'owner must be set');
    }

    // Normal logic
    this.update(dt);
  }
}
```

## Conventions

### Priority Ranges

Establish conventions for your domain:

```typescript
// Physics layer: 0-19
const PRIORITY_ACCELERATION = 0;
const PRIORITY_VELOCITY = 5;
const PRIORITY_POSITION = 10;

// Game logic: 20-49
const PRIORITY_SKILLS = 25;
const PRIORITY_AI = 30;
const PRIORITY_COLLISION = 35;

// Resources: 50-79
const PRIORITY_STAMINA = 55;
const PRIORITY_COOLDOWNS = 60;

// Validation: 80-99
const PRIORITY_BOUNDS = 85;
const PRIORITY_CLAMPS = 90;

// Debug: 100+
const PRIORITY_DEBUG = 1000;
```

### Event Naming

```typescript
// Domain:Action pattern
'race:started';
'race:finished';
'race:phaseChanged';

'runner:moved';
'runner:overtook';
'runner:finished';

'skill:activated';
'skill:ended';
'skill:debuff';

'collision:detected';
'collision:resolved';
```

### Behavior Naming

```typescript
// Action-based names
class CalculateTargetSpeed extends Behavior {}
class ApplySkillEffects extends Behavior {}
class UpdateLanePosition extends Behavior {}

// Or capability-based
class MovementBehavior extends Behavior {}
class StaminaBehavior extends Behavior {}
class SkillBehavior extends Behavior {}
```

## Scalability

### Pattern: Spatial Partitioning

For large simulations with many entities:

```typescript
class SpatialGridBehavior extends Behavior {
  grid = new Map<string, Entity[]>();

  override onUpdate(): void {
    // Clear grid
    this.grid.clear();

    // Partition entities by position
    const entities = this.owner?.engine?.getEntities() || [];
    for (const entity of entities) {
      const movement = entity.getBehavior(MovementBehavior);
      if (movement) {
        const cell = this.getCellKey(movement.position);
        if (!this.grid.has(cell)) {
          this.grid.set(cell, []);
        }
        this.grid.get(cell)!.push(entity);
      }
    }

    // Emit grid update
    this.owner?.engine?.eventBus.emit('spatial:gridUpdated', {
      grid: this.grid,
    });
  }
}
```

### Pattern: Level of Detail

Update less frequently when not critical:

```typescript
class LODBehavior extends Behavior {
  updateInterval = 1.0; // Update once per second
  timeSinceUpdate = 0;

  override onUpdate(dt: number): void {
    this.timeSinceUpdate += dt;

    if (this.timeSinceUpdate >= this.updateInterval) {
      this.expensiveUpdate();
      this.timeSinceUpdate = 0;
    }
  }
}
```

## Summary

Follow these principles for robust simulations:

1. **Single Responsibility**: Each behavior does one thing well
2. **Clear Communication**: Events for loose coupling, direct access for tight coupling
3. **Deterministic**: No hidden randomness, explicit time
4. **Testable**: Test behaviors in isolation and integration
5. **Performant**: Cache lookups, minimize behavior count, early exits
6. **Maintainable**: Clear naming, good documentation, organized structure

## Next Steps

- [API Reference](08-api-reference.md) - Complete API documentation
- [Examples](../__tests__/integration.test.ts) - See patterns in action
