# Your First Simulation

Let's build a complete working simulation in 5 minutes. We'll create a simple physics simulation with a moving object and see real results.

## What We're Building

A ball that:

- Moves at constant velocity
- Tracks its position over time
- Runs for 2 seconds
- Outputs its final position

Simple, but it covers all the core concepts!

## Step 1: Import Tiny Engine

```typescript
import { GameEngine, Entity, Behavior } from '@/lib/tiny-engine';
```

That's all you need! Three classes to build entire simulations.

## Step 2: Create Your First Behavior

Behaviors define what happens each tick. Let's create one that handles motion:

```typescript
class MovementBehavior extends Behavior {
  position = 0;
  velocity = 10; // units per second

  override onUpdate(dt: number): void {
    // Update position based on velocity
    this.position += this.velocity * dt;
  }
}
```

That's it! Every tick, the position increases by `velocity * dt`.

**What's `dt`?** It's "delta time"—the time since the last tick. If running at 60fps, `dt` would be ~0.016 seconds.

## Step 3: Create an Entity

Entities are containers for behaviors. Think of them as "things" in your simulation:

```typescript
const ball = new Entity('ball-1');
```

We gave it an ID (`'ball-1'`) so we can identify it later.

## Step 4: Attach the Behavior

Connect your behavior to the entity:

```typescript
const movementBehavior = new MovementBehavior();
ball.addBehavior(movementBehavior);
```

Now the ball knows how to move! Notice we saved a reference to `movementBehavior`—we'll need it later to read the results.

## Step 5: Create the Engine

The engine orchestrates everything:

```typescript
const engine = new GameEngine();
```

## Step 6: Add Entity to Engine

Register your entity:

```typescript
engine.addEntity(ball);
```

Now the engine will update the ball every tick.

## Step 7: Run the Simulation

Let's run for 2 seconds at 60 frames per second:

```typescript
engine.run(2.0, 0.016);
```

Behind the scenes:

- Engine calls `tick(0.016)` repeatedly
- Each tick updates all entities
- Each entity updates all its behaviors
- Time advances by `0.016` each tick
- Stops when time reaches `2.0`

## Step 8: Read the Results

Check where the ball ended up:

```typescript
console.log('Final position:', movementBehavior.position);
// Output: Final position: 20
```

Math check: `10 units/second × 2 seconds = 20 units` ✅

## The Complete Code

Here's everything together:

```typescript
import { GameEngine, Entity, Behavior } from '@/lib/tiny-engine';

class MovementBehavior extends Behavior {
  position = 0;
  velocity = 10;

  override onUpdate(dt: number): void {
    this.position += this.velocity * dt;
  }
}

// Setup
const engine = new GameEngine();
const ball = new Entity('ball-1');
const movement = new MovementBehavior();

ball.addBehavior(movement);
engine.addEntity(ball);

// Run
engine.run(2.0, 0.016);

// Results
console.log('Final position:', movement.position); // 20
console.log('Final time:', engine.time); // 2.0
```

**Try it yourself!** Copy this code and run it. Change the velocity, change the duration, see what happens.

## Adding More Complexity

Let's make it more interesting by adding acceleration:

```typescript
class AccelerationBehavior extends Behavior {
  velocity = 0;
  acceleration = 5; // units per second²

  override onUpdate(dt: number): void {
    this.velocity += this.acceleration * dt;
  }
}

class MovementBehavior extends Behavior {
  position = 0;

  override onUpdate(dt: number): void {
    // Get the velocity from AccelerationBehavior
    const accel = this.owner?.getBehavior(AccelerationBehavior);
    if (accel) {
      this.position += accel.velocity * dt;
    }
  }
}

const ball = new Entity('ball-1');
ball.addBehavior(new AccelerationBehavior());
ball.addBehavior(new MovementBehavior());

engine.addEntity(ball);
engine.run(2.0, 0.1);

const movement = ball.getBehavior(MovementBehavior);
console.log('Final position:', movement?.position); // ~10 (with acceleration)
```

Notice how `MovementBehavior` gets data from `AccelerationBehavior` using `getBehavior()`!

## Common Pitfalls

### Forgetting `override`

```typescript
// ❌ TypeScript won't warn you
class MyBehavior extends Behavior {
  onUpdate(dt: number): void {
    // Missing override keyword
    // ...
  }
}

// ✅ Better
class MyBehavior extends Behavior {
  override onUpdate(dt: number): void {
    // ...
  }
}
```

### Accessing Engine Too Early

```typescript
// ❌ Engine is null during constructor
class MyBehavior extends Behavior {
  constructor() {
    super();
    this.owner?.engine?.eventBus.on(...); // owner is null!
  }
}

// ✅ Subscribe in onUpdate (when engine is available)
class MyBehavior extends Behavior {
  private subscribed = false;

  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('event', this.handler);
      this.subscribed = true;
    }
  }
}
```

### Not Saving Behavior References

```typescript
// ❌ Can't read results later
ball.addBehavior(new MovementBehavior());
// How do I get the position now?

// ✅ Keep a reference
const movement = new MovementBehavior();
ball.addBehavior(movement);
// Easy access: movement.position
```

## Next Steps

Congratulations! You've built your first simulation.

Ready to learn more?

- [Behaviors in depth](04-behaviors.md) - Master behavior patterns
- [Events](05-events.md) - Learn event-driven architecture
- [Advanced Patterns](06-advanced-patterns.md) - Build production systems

Want to see a more complex example? Check out [integration.test.ts](../__tests__/integration.test.ts) in the test suite.
