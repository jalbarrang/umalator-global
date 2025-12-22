# Advanced Patterns

Now that you understand the basics, let's explore production-ready patterns for complex simulations.

## Multi-Entity Simulations

Real simulations often involve multiple entities interacting. Here's how to structure them:

### Pattern: Race Orchestrator + Runners

```typescript
// The race orchestrator manages global state
class RaceSimulator extends Entity {
  constructor(course: CourseData) {
    super('race-simulator');

    this.addBehavior(new PhaseTransitionBehavior(course));
    this.addBehavior(new PacemakerBehavior());
    this.addBehavior(new RaceEndBehavior());
  }
}

// Individual runners
class Runner extends Entity {
  constructor(id: string, params: RunnerParams) {
    super(id);

    this.addBehavior(new MovementBehavior(params));
    this.addBehavior(new StaminaBehavior(params));
    this.addBehavior(new SkillBehavior(params));
  }
}

// Setup
const engine = new GameEngine();
const race = new RaceSimulator(courseData);
engine.addEntity(race);

for (let i = 0; i < 18; i++) {
  const runner = new Runner(`runner-${i}`, runnerParams[i]);
  engine.addEntity(runner);
}

// Run
engine.run(raceTime, 0.0666); // 15 FPS
```

**Key insight**: The race itself is an entity! It has behaviors that manage phases, track leaders, etc.

## Behavior Composition

Build complex behaviors from simple ones:

### Pattern: State Machine Behavior

```typescript
type SpurtState = 'calculating' | 'ready' | 'active' | 'exhausted';

class LastSpurtBehavior extends Behavior {
  state: SpurtState = 'calculating';
  spurtSpeed = 0;

  override onUpdate(dt: number): void {
    switch (this.state) {
      case 'calculating':
        this.calculateSpurtSpeed();
        this.state = 'ready';
        break;

      case 'ready':
        if (this.shouldEnterLastSpurt()) {
          this.state = 'active';
          this.owner?.engine?.eventBus.emit('runner:lastSpurt', {
            runnerId: this.owner!.id,
            spurtSpeed: this.spurtSpeed,
          });
        }
        break;

      case 'active':
        this.applySpurtSpeed();
        if (this.exhausted()) {
          this.state = 'exhausted';
        }
        break;

      case 'exhausted':
        // No more spurt available
        break;
    }
  }
}
```

### Pattern: Decorator Behavior

Modify another behavior's output:

```typescript
class BaseSpeedBehavior extends Behavior {
  speed = 20;

  override onUpdate(): void {
    // Calculate base speed
  }
}

class SpeedModifierBehavior extends Behavior {
  priority = 10; // Run after base speed

  override onUpdate(): void {
    const baseSpeed = this.owner?.getBehavior(BaseSpeedBehavior);
    if (baseSpeed) {
      // Apply modifiers (slope, ground, etc.)
      const slope = this.getSlopeModifier();
      const ground = this.getGroundModifier();

      baseSpeed.speed += slope + ground;
      baseSpeed.speed = Math.max(0, baseSpeed.speed); // Clamp
    }
  }
}
```

### Pattern: Aggregator Behavior

Collect data from multiple sources:

```typescript
class FinalSpeedBehavior extends Behavior {
  priority = 100; // Run last
  finalSpeed = 0;

  override onUpdate(): void {
    // Aggregate all speed modifiers
    const base = this.owner?.getBehavior(BaseSpeedBehavior);
    const skill = this.owner?.getBehavior(SkillSpeedBehavior);
    const terrain = this.owner?.getBehavior(TerrainSpeedBehavior);

    this.finalSpeed = (base?.speed || 0)
                    + (skill?.bonus || 0)
                    + (terrain?.modifier || 0);

    // Apply final clamps
    this.finalSpeed = Math.min(Math.max(this.finalSpeed, 0), 30);
  }
}
```

## State Sharing Strategies

### Strategy 1: Behavior-to-Behavior (Same Entity)

Direct access via `getBehavior()`:

```typescript
class StaminaBehavior extends Behavior {
  override onUpdate(dt: number): void {
    const movement = this.owner?.getBehavior(MovementBehavior);
    if (movement) {
      // Use movement's current speed
      this.consumeHP(movement.currentSpeed, dt);
    }
  }
}
```

**When to use**: Behaviors on the same entity that need tight coupling.

### Strategy 2: Events (Cross-Entity)

Emit and subscribe to events:

```typescript
// Publisher
class RunnerBehavior extends Behavior {
  override onUpdate(): void {
    this.owner?.engine?.eventBus.emit('runner:update', {
      id: this.owner.id,
      position: this.position,
      speed: this.speed,
    });
  }
}

// Subscriber
class LeaderboardBehavior extends Behavior {
  positions = new Map<string, number>();

  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('runner:update', (data) => {
        this.positions.set(data.id, data.position);
      });
      this.subscribed = true;
    }
  }
}
```

**When to use**: Cross-entity communication, loose coupling.

### Strategy 3: Shared Context (Advanced)

For truly global state, extend Entity:

```typescript
class RaceSimulator extends Entity {
  // Shared context available to all behaviors
  readonly course: CourseData;
  currentPhase: IPhase = 0;
  pacemaker: string | null = null;

  constructor(course: CourseData) {
    super('race-simulator');
    this.course = course;
  }
}

// Behaviors access context via owner
class PhaseTransitionBehavior extends Behavior {
  override onUpdate(): void {
    const race = this.owner as RaceSimulator;

    // Access shared context
    if (this.shouldTransitionPhase(race.currentPhase)) {
      race.currentPhase = this.getNextPhase();

      // Notify via events
      this.owner?.engine?.eventBus.emit('race:phaseChanged', {
        phase: race.currentPhase,
      });
    }
  }
}
```

**When to use**: Truly global state (course data, race phase, etc.).

## Dynamic Entity Management

Add and remove entities during simulation:

### Pattern: Entity Spawning

```typescript
class EnemySpawnerBehavior extends Behavior {
  spawnTimer = 0;
  spawnInterval = 5.0;

  override onUpdate(dt: number): void {
    this.spawnTimer += dt;

    if (this.spawnTimer >= this.spawnInterval) {
      // Spawn new entity
      const enemy = new Entity(`enemy-${Date.now()}`);
      enemy.addBehavior(new EnemyAIBehavior());
      enemy.addBehavior(new HealthBehavior());

      this.owner?.engine?.addEntity(enemy);

      this.spawnTimer = 0;
    }
  }
}
```

### Pattern: Entity Removal

```typescript
class LifetimeBehavior extends Behavior {
  lifetime = 0;
  maxLifetime = 10.0;

  override onUpdate(dt: number): void {
    this.lifetime += dt;

    if (this.lifetime >= this.maxLifetime) {
      // Remove self from engine
      if (this.owner?.engine) {
        this.owner.engine.removeEntity(this.owner);
      }
    }
  }
}
```

## Priority Chains

Complex simulations need carefully ordered execution:

```typescript
class Runner extends Entity {
  constructor(id: string, params: RunnerParams) {
    super(id);

    // Priority chain for racing logic:

    // 1. Calculate target speed (priority: 0)
    this.addBehavior(new TargetSpeedBehavior(params));

    // 2. Apply skill speed modifiers (priority: 5)
    this.addBehavior(new SkillSpeedBehavior());

    // 3. Calculate acceleration (priority: 10)
    this.addBehavior(new AccelerationBehavior(params));

    // 4. Update velocity (priority: 15)
    this.addBehavior(new VelocityBehavior());

    // 5. Update position (priority: 20)
    this.addBehavior(new PositionBehavior());

    // 6. Check collisions (priority: 25)
    this.addBehavior(new CollisionBehavior());

    // 7. Consume stamina (priority: 30)
    this.addBehavior(new StaminaBehavior(params));

    // 8. Apply boundary clamping (priority: 100)
    this.addBehavior(new BoundaryBehavior());
  }
}
```

**Each behavior builds on the previous one's output.**

## Error Handling

### Pattern: Graceful Degradation

```typescript
class RobustBehavior extends Behavior {
  override onUpdate(dt: number): void {
    try {
      // Potentially risky operation
      const data = this.complexCalculation();
      this.applyData(data);
    } catch (error) {
      console.error('Behavior error:', error);
      // Emit error event for monitoring
      this.owner?.engine?.eventBus.emit('behavior:error', {
        behaviorType: this.constructor.name,
        entityId: this.owner?.id,
        error: error.message,
      });
      // Use safe default
      this.applyDefaultBehavior();
    }
  }
}
```

### Pattern: Validation

```typescript
class ValidatedBehavior extends Behavior {
  override onUpdate(dt: number): void {
    // Validate state before processing
    if (!this.isValid()) {
      console.warn(`Invalid state in ${this.owner?.id}`);
      return; // Skip this tick
    }

    // Proceed with logic
    this.normalUpdate(dt);
  }

  private isValid(): boolean {
    return this.owner !== null
        && this.owner.engine !== null
        && this.requiredBehaviors();
  }

  private requiredBehaviors(): boolean {
    // Check dependencies
    return this.owner?.hasBehavior(MovementBehavior) ?? false;
  }
}
```

## Performance Optimization

### Pattern: Lazy Calculation

Don't calculate every tick if not needed:

```typescript
class LastSpurtBehavior extends Behavior {
  private cachedSpurtSpeed: number | null = null;
  private needsRecalculation = true;

  override onUpdate(): void {
    // Only recalculate when needed
    if (this.needsRecalculation) {
      this.cachedSpurtSpeed = this.calculateSpurtSpeed();
      this.needsRecalculation = false;
    }

    // Use cached value
    this.applySpurtSpeed(this.cachedSpurtSpeed!);
  }

  // Mark for recalculation when state changes
  onHPRecovery(): void {
    this.needsRecalculation = true;
  }
}
```

### Pattern: Early Exit

Skip expensive calculations when not needed:

```typescript
class SkillBehavior extends Behavior {
  override onUpdate(dt: number): void {
    // Early exit if no skills to process
    if (this.pendingSkills.length === 0 && this.activeSkills.length === 0) {
      return;
    }

    // Only do expensive work when necessary
    this.processSkills(dt);
  }
}
```

### Pattern: Batch Updates

Process multiple items together:

```typescript
class BatchedPositionBehavior extends Behavior {
  updateInterval = 1.0; // Update once per second
  timeSinceUpdate = 0;

  override onUpdate(dt: number): void {
    this.timeSinceUpdate += dt;

    if (this.timeSinceUpdate >= this.updateInterval) {
      // Batch update
      this.recalculateAllPositions();
      this.timeSinceUpdate = 0;
    }
  }
}
```

## Debugging Techniques

### Pattern: Debug Behavior

Add a special debugging behavior:

```typescript
class DebugBehavior extends Behavior {
  priority = 1000; // Run last to see final state

  override onUpdate(): void {
    console.log('=== Debug Info ===');
    console.log('Entity:', this.owner?.id);
    console.log('Time:', this.owner?.engine?.time);

    // Log all behaviors
    for (const behavior of this.owner?.getBehaviors() || []) {
      console.log(`  ${behavior.constructor.name}:`, behavior);
    }
  }
}

// Enable only when needed
const debug = new DebugBehavior();
debug.enabled = false; // Off by default
runner.addBehavior(debug);

// Turn on for debugging
debug.enabled = true;
```

### Pattern: Snapshot Behavior

Capture state at specific times:

```typescript
class SnapshotBehavior extends Behavior {
  snapshots: Array<{ time: number; state: any }> = [];
  snapshotInterval = 1.0;
  timeSinceSnapshot = 0;

  override onUpdate(dt: number): void {
    this.timeSinceSnapshot += dt;

    if (this.timeSinceSnapshot >= this.snapshotInterval) {
      this.captureSnapshot();
      this.timeSinceSnapshot = 0;
    }
  }

  private captureSnapshot(): void {
    const movement = this.owner?.getBehavior(MovementBehavior);
    const stamina = this.owner?.getBehavior(StaminaBehavior);

    this.snapshots.push({
      time: this.owner?.engine?.time || 0,
      state: {
        position: movement?.position,
        speed: movement?.velocity,
        hp: stamina?.hp,
      },
    });
  }
}
```

### Pattern: Conditional Logging

Log only interesting events:

```typescript
class SmartLoggerBehavior extends Behavior {
  private lastPosition = 0;

  override onUpdate(): void {
    const movement = this.owner?.getBehavior(MovementBehavior);
    if (!movement) return;

    // Log only significant changes
    if (Math.abs(movement.position - this.lastPosition) > 100) {
      console.log(
        `[${this.owner?.engine?.time.toFixed(2)}s] ` +
        `${this.owner?.id} at ${movement.position.toFixed(2)}`
      );
      this.lastPosition = movement.position;
    }
  }
}
```

## Monte Carlo Patterns

Running thousands of simulations requires special patterns:

### Pattern: Deterministic Setup

```typescript
function runMonteCarloSimulation(
  config: SimConfig,
  seeds: number[]
): SimResult[] {
  return seeds.map((seed) => {
    // Create engine
    const engine = new GameEngine();

    // Create seeded RNG
    const rng = new SeededRng(seed);

    // Setup with deterministic parameters
    const runner = new Runner('runner-1', {
      speed: 1200,
      stamina: 1000,
      // ... more params
    }, rng);

    engine.addEntity(runner);

    // Run
    engine.run(config.duration, 0.0666);

    // Extract results
    const movement = runner.getBehavior(MovementBehavior);
    return {
      seed,
      finalPosition: movement?.position || 0,
      finalTime: engine.time,
    };
  });
}

// Run 10000 simulations
const results = runMonteCarloSimulation(config, generateSeeds(10000));
```

### Pattern: Result Extraction

Clean interface for getting results:

```typescript
class ResultCollectorBehavior extends Behavior {
  priority = 1000; // Run absolutely last

  results: SimulationResults = {
    positions: [],
    speeds: [],
    hpHistory: [],
    skillActivations: [],
  };

  override onUpdate(): void {
    // Collect data from all behaviors
    const movement = this.owner?.getBehavior(MovementBehavior);
    const stamina = this.owner?.getBehavior(StaminaBehavior);
    const skills = this.owner?.getBehavior(SkillBehavior);

    this.results.positions.push(movement?.position || 0);
    this.results.speeds.push(movement?.velocity || 0);
    this.results.hpHistory.push(stamina?.hp || 0);

    // Append to skill activations list if any activated this tick
    // ...
  }
}

// After simulation
const results = runner.getBehavior(ResultCollectorBehavior)?.results;
```

## Communication Patterns

### Pattern: Observer

Multiple behaviors react to one event:

```typescript
// One emitter
class PhaseTransitionBehavior extends Behavior {
  override onUpdate(): void {
    if (this.shouldTransition()) {
      this.owner?.engine?.eventBus.emit('race:phaseChanged', {
        newPhase: this.newPhase,
      });
    }
  }
}

// Multiple observers
class SkillBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('race:phaseChanged', (data) => {
        this.onPhaseChange(data.newPhase);
      });
      this.subscribed = true;
    }
  }
}

class StrategyBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('race:phaseChanged', (data) => {
        this.adjustStrategy(data.newPhase);
      });
      this.subscribed = true;
    }
  }
}
```

### Pattern: Command

Send commands to specific entities:

```typescript
// Command sender
class AIBehavior extends Behavior {
  override onUpdate(): void {
    if (this.shouldUseSkill()) {
      this.owner?.engine?.eventBus.emit('command:useSkill', {
        targetId: this.owner.id,
        skillId: 'speed-boost',
      });
    }
  }
}

// Command processor
class SkillBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('command:useSkill', (data) => {
        if (data.targetId === this.owner?.id) {
          this.activateSkill(data.skillId);
        }
      });
      this.subscribed = true;
    }
  }
}
```

### Pattern: Aggregator Query

Collect data from all entities:

```typescript
class RankingBehavior extends Behavior {
  rankings: Array<{ id: string; position: number }> = [];

  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      // Request position reports
      this.owner.engine.eventBus.on('race:reportPositionsResponse', (data) => {
        this.rankings.push(data);
      });
      this.subscribed = true;
    }

    // Clear and request fresh data
    this.rankings = [];
    this.owner?.engine?.eventBus.emit('race:reportPositions');

    // Sort rankings
    this.rankings.sort((a, b) => b.position - a.position);
  }
}

// Each runner responds
class PositionReporterBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('race:reportPositions', () => {
        const movement = this.owner?.getBehavior(MovementBehavior);
        this.owner?.engine?.eventBus.emit('race:reportPositionsResponse', {
          id: this.owner.id,
          position: movement?.position || 0,
        });
      });
      this.subscribed = true;
    }
  }
}
```

## Testing Patterns

### Pattern: Behavior Unit Test

Test behaviors in isolation:

```typescript
import { describe, it, expect } from 'bun:test';

describe('MovementBehavior', () => {
  it('should update position based on velocity', () => {
    const entity = new Entity('test');
    const behavior = new MovementBehavior();
    behavior.velocity = 10;

    entity.addBehavior(behavior);
    entity.update(0.1);

    expect(behavior.position).toBeCloseTo(1.0);
  });
});
```

### Pattern: Integration Test

Test multiple behaviors together:

```typescript
describe('Physics Integration', () => {
  it('should handle acceleration and movement', () => {
    const engine = new GameEngine();
    const entity = new Entity('test');

    const accel = new AccelerationBehavior();
    const movement = new MovementBehavior();

    entity.addBehavior(accel);
    entity.addBehavior(movement);
    engine.addEntity(entity);

    engine.run(1.0, 0.1);

    expect(movement.position).toBeGreaterThan(0);
  });
});
```

### Pattern: Determinism Test

Verify same seed produces same results:

```typescript
describe('Determinism', () => {
  it('should produce identical results with same seed', () => {
    const results: number[] = [];

    for (let run = 0; run < 100; run++) {
      const engine = new GameEngine();
      const rng = new SeededRng(12345);
      const runner = createRunner(rng);

      engine.addEntity(runner);
      engine.run(10.0, 0.0666);

      const movement = runner.getBehavior(MovementBehavior);
      results.push(movement?.position || 0);
    }

    // All results should be identical
    expect(results.every(r => r === results[0])).toBe(true);
  });
});
```

## Performance Profiling

### Pattern: Timing Behavior

Measure execution time:

```typescript
class ProfilingBehavior extends Behavior {
  behaviorTimes = new Map<string, number>();

  override onUpdate(): void {
    for (const behavior of this.owner?.getBehaviors() || []) {
      const start = performance.now();

      // This is a hack - normally you'd wrap the update call
      // Just for illustration

      const end = performance.now();
      const existing = this.behaviorTimes.get(behavior.constructor.name) || 0;
      this.behaviorTimes.set(behavior.constructor.name, existing + (end - start));
    }
  }
}
```

### Pattern: Memory Monitoring

Track entity count and behavior count:

```typescript
class MemoryMonitorBehavior extends Behavior {
  override onUpdate(): void {
    const entityCount = this.owner?.engine?.entityCount || 0;
    const behaviorCount = this.owner?.getBehaviors().length || 0;

    console.log(`Entities: ${entityCount}, Behaviors/entity: ${behaviorCount}`);
  }
}
```

## Next Steps

You've mastered advanced patterns! Now learn how to design production systems:
- [Best Practices](07-best-practices.md) - Design principles and conventions
- [API Reference](08-api-reference.md) - Complete API documentation

Want to see these patterns in action? Check the [integration tests](../__tests__/integration.test.ts) for working examples.

