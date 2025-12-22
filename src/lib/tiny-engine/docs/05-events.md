# Events

Events are how entities and behaviors communicate without tight coupling. Let's master the EventBus.

## Why Events?

Imagine a racing simulator where a skill affects multiple opponents. Without events:

```typescript
// ❌ Tight coupling nightmare
class DebuffSkillBehavior extends Behavior {
  override onUpdate(): void {
    // How do we find other runners?
    // How do we access their stamina behaviors?
    // What if the structure changes?
  }
}
```

With events:

```typescript
// ✅ Clean and decoupled
class DebuffSkillBehavior extends Behavior {
  override onUpdate(): void {
    this.owner?.engine?.eventBus.emit('debuff:applied', {
      targetId: 'runner-2',
      effect: 'slow',
      amount: 0.2,
    });
  }
}

class StaminaBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('debuff:applied', (data) => {
        if (data.targetId === this.owner?.id) {
          this.applyDebuff(data.effect, data.amount);
        }
      });
      this.subscribed = true;
    }
  }
}
```

No references needed! Publishers and subscribers don't know about each other.

## Publishing Events

Use `emit` to publish an event:

```typescript
class MilestoneBehavior extends Behavior {
  override onUpdate(): void {
    const movement = this.owner?.getBehavior(MovementBehavior);

    if (movement && movement.position >= 1000) {
      this.owner?.engine?.eventBus.emit('milestone:reached', {
        entityId: this.owner.id,
        position: movement.position,
        time: this.owner.engine.time,
      });
    }
  }
}
```

**Event structure**:
- Event name (string)
- Event data (any type, but objects are conventional)

### Event Naming Conventions

Use clear, descriptive names with namespace prefixes:

```typescript
// ✅ Good: Namespace:Action pattern
'skill:activated'
'runner:finished'
'phase:changed'
'debuff:applied'
'collision:detected'

// ❌ Avoid: Generic or unclear
'update'
'change'
'event'
'notify'
```

**Why namespace?** Prevents collisions and makes event flow clear.

## Subscribing to Events

### on: Subscribe Indefinitely

Listen to every occurrence of an event:

```typescript
class ScoreboardBehavior extends Behavior {
  scores = new Map<string, number>();

  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('milestone:reached', (data) => {
        const currentScore = this.scores.get(data.entityId) || 0;
        this.scores.set(data.entityId, currentScore + 10);
      });
      this.subscribed = true;
    }
  }
}
```

### once: Subscribe Once

Listen to only the first occurrence:

```typescript
class StartBehavior extends Behavior {
  startTime = 0;

  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.once('race:started', (data) => {
        this.startTime = data.time;
        console.log('Race started at', this.startTime);
      });
      this.subscribed = true;
    }
  }
}
```

**Use `once`** for events that only happen once (race start, race end, phase transitions).

### off: Unsubscribe

Stop listening to an event:

```typescript
class TemporaryListenerBehavior extends Behavior {
  private handler = (data: any) => {
    console.log('Event received:', data);
  };

  override onUpdate(): void {
    if (this.shouldStopListening && this.owner?.engine) {
      this.owner.engine.eventBus.off('event:name', this.handler);
    }
  }

  override onDetach(): void {
    // Always clean up in onDetach
    this.owner?.engine?.eventBus.off('event:name', this.handler);
    super.onDetach();
  }
}
```

**Important**: Always use the same handler reference for `off` to work!

## When to Subscribe

Behaviors need the engine reference to access the event bus. The engine isn't available until the entity is added to it. Here's the pattern:

```typescript
class MyBehavior extends Behavior {
  private subscribed = false;

  override onUpdate(): void {
    // Subscribe on first update when engine is available
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('event:name', this.handler);
      this.subscribed = true;
    }

    // Rest of update logic...
  }
}
```

**Why in onUpdate?** Because:
- `onAttach` runs before entity is added to engine
- `onUpdate` runs after engine reference is set
- First tick is a safe place to subscribe

## Cross-Entity Communication

Events shine when entities need to talk to each other:

```typescript
// Sender entity
class SkillActivatorBehavior extends Behavior {
  override onUpdate(): void {
    if (this.skillReady) {
      this.owner?.engine?.eventBus.emit('skill:aoe-debuff', {
        sourceId: this.owner.id,
        effect: 'slow',
        radius: 50,
      });
    }
  }
}

// Receiver entity (completely separate!)
class DebuffReceiverBehavior extends Behavior {
  activeDebuffs: string[] = [];

  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('skill:aoe-debuff', (data) => {
        // Check if we're in range
        const movement = this.owner?.getBehavior(MovementBehavior);
        if (this.isInRange(movement, data)) {
          this.activeDebuffs.push(data.effect);
        }
      });
      this.subscribed = true;
    }
  }
}
```

## Request-Response Pattern

Events can implement request-response:

```typescript
// Server behavior
class DataProviderBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('data:request', (data) => {
        // Process request and respond
        this.owner?.engine?.eventBus.emit('data:response', {
          requestId: data.requestId,
          result: this.processRequest(data),
        });
      });
      this.subscribed = true;
    }
  }
}

// Client behavior
class DataConsumerBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('data:response', (data) => {
        if (data.requestId === this.currentRequestId) {
          this.handleResponse(data.result);
        }
      });
      this.subscribed = true;
    }

    // Send request
    if (this.needsData) {
      this.currentRequestId = generateId();
      this.owner?.engine?.eventBus.emit('data:request', {
        requestId: this.currentRequestId,
        query: 'current-phase',
      });
    }
  }
}
```

## Typed Events

For type safety, define an event map:

```typescript
type RaceEvents = {
  'phase:changed': { oldPhase: number; newPhase: number };
  'runner:finished': { runnerId: string; time: number };
  'skill:activated': { runnerId: string; skillId: string };
};

const engine = new GameEngine();
const typedBus = engine.eventBus as EventBus<RaceEvents>;

// Now TypeScript knows the event structure
typedBus.on('phase:changed', (data) => {
  console.log(data.oldPhase); // TypeScript knows this exists!
  // console.log(data.foo); // Error: Property 'foo' doesn't exist
});
```

## Event Timing

Events in Tiny Engine fire **synchronously**:

```typescript
const order: number[] = [];

engine.eventBus.on('test', () => {
  order.push(2);
});

order.push(1);
engine.eventBus.emit('test');
order.push(3);

console.log(order); // [1, 2, 3]
```

This is **important** for determinism! Events happen immediately, in order, with no async surprises.

## Multiple Listeners

Multiple behaviors can listen to the same event:

```typescript
// Listener 1: UI updates
class UIBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('runner:moved', (data) => {
        this.updateDisplay(data.runnerId, data.position);
      });
      this.subscribed = true;
    }
  }
}

// Listener 2: Collision detection
class CollisionBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('runner:moved', (data) => {
        this.checkCollision(data.runnerId, data.position);
      });
      this.subscribed = true;
    }
  }
}

// Listener 3: Analytics
class AnalyticsBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('runner:moved', (data) => {
        this.recordPosition(data.runnerId, data.position);
      });
      this.subscribed = true;
    }
  }
}
```

All three listen to the same event. They execute in the order they subscribed.

## Cleaning Up Listeners

Always clean up event listeners in `onDetach`:

```typescript
class EventfulBehavior extends Behavior {
  private handler = (data: any) => {
    // Handle event
  };

  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('my:event', this.handler);
      this.subscribed = true;
    }
  }

  override onDetach(): void {
    // Clean up listener before detaching
    this.owner?.engine?.eventBus.off('my:event', this.handler);
    super.onDetach();
  }
}
```

**Why it matters**: Prevents memory leaks and ensures removed behaviors stop reacting to events.

## Common Event Patterns

### Pattern 1: Broadcast

One entity notifies everyone:

```typescript
// Race simulator broadcasts phase change
this.owner?.engine?.eventBus.emit('race:phaseChanged', {
  phase: 'last-spurt',
  distance: 2400,
});

// All runners listen and react
this.owner?.engine?.eventBus.on('race:phaseChanged', (data) => {
  if (data.phase === 'last-spurt') {
    this.enterLastSpurt();
  }
});
```

### Pattern 2: Targeted

Event meant for specific entity:

```typescript
// Skill targets specific runner
this.owner?.engine?.eventBus.emit('debuff:applied', {
  targetId: 'runner-3',
  effect: 'slow',
  duration: 2.0,
});

// Each runner checks if they're the target
this.owner?.engine?.eventBus.on('debuff:applied', (data) => {
  if (data.targetId === this.owner?.id) {
    this.applyDebuff(data.effect, data.duration);
  }
});
```

### Pattern 3: Query

Request information from other entities:

```typescript
// Request current pacemaker
this.owner?.engine?.eventBus.emit('race:getPacemaker', {
  requestId: this.requestId,
});

// Race simulator responds
this.owner?.engine?.eventBus.on('race:getPacemaker', (data) => {
  this.owner?.engine?.eventBus.emit('race:pacemakerResponse', {
    requestId: data.requestId,
    pacemakerId: this.currentPacemaker,
  });
});
```

### Pattern 4: Aggregation

Collect responses from multiple entities:

```typescript
// Request all positions
this.owner?.engine?.eventBus.emit('race:reportPositions');

// Each runner reports
this.owner?.engine?.eventBus.on('race:reportPositions', () => {
  this.owner?.engine?.eventBus.emit('race:positionReport', {
    runnerId: this.owner.id,
    position: this.position,
  });
});

// Collector aggregates
this.owner?.engine?.eventBus.on('race:positionReport', (data) => {
  this.positions.set(data.runnerId, data.position);
});
```

## Racing Simulator Example

Here's how you might use events in a racing simulator:

```typescript
// Phase transitions (broadcast)
'race:phaseChanged' → { oldPhase, newPhase }

// Skill system (targeted)
'skill:activated' → { runnerId, skillId, targets: [...] }
'skill:debuff' → { targetId, effect, duration }
'skill:buff' → { targetId, effect, duration }

// Position tracking (broadcast)
'runner:positionChanged' → { runnerId, position, lane }
'runner:overtook' → { runnerId, overtakenId }

// Race milestones (broadcast)
'race:started' → { startTime }
'race:finished' → { winnerId, time }
'section:entered' → { section, runnerId }

// Special states (broadcast)
'runner:rushed' → { runnerId }
'runner:duel' → { runner1Id, runner2Id }
'runner:outOfStamina' → { runnerId }
```

## Event Payload Best Practices

### Always Include Context

```typescript
// ✅ Good: Includes enough context
engine.eventBus.emit('skill:activated', {
  runnerId: this.owner.id,
  skillId: 'speed-boost',
  timestamp: engine.time,
  position: this.position,
});

// ❌ Bad: Not enough context
engine.eventBus.emit('skill:activated', {
  skillId: 'speed-boost',
  // Who activated it? When? Where?
});
```

### Use Consistent Structure

```typescript
// ✅ Consistent pattern
type EventPayload = {
  entityId: string;    // Who
  timestamp: number;   // When
  data: any;          // What
};

engine.eventBus.emit('event:name', {
  entityId: this.owner.id,
  timestamp: this.owner.engine.time,
  data: { /* specific data */ },
});
```

### Keep Payloads Simple

```typescript
// ✅ Simple, serializable data
{ runnerId: 'runner-1', speed: 15.5, position: 1234 }

// ❌ Complex objects
{ runnerId: 'runner-1', behavior: movementBehaviorInstance }
```

**Why?** Simple data is easier to debug, log, and serialize for analysis.

## Conditional Event Handling

Not every listener needs to react to every event:

```typescript
class SkillReactionBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('skill:activated', (data) => {
        // Only react if we're close to the caster
        const distance = this.calculateDistance(data.runnerId);
        if (distance < data.radius) {
          this.reactToSkill(data);
        }
      });
      this.subscribed = true;
    }
  }
}
```

## Event Filtering

Filter events by checking the payload:

```typescript
// Listen only to phase changes entering last spurt
this.owner?.engine?.eventBus.on('race:phaseChanged', (data) => {
  if (data.newPhase === 3) { // Phase 3 = Last Spurt
    this.enterLastSpurt();
  }
});

// Listen only to skills from specific runner
this.owner?.engine?.eventBus.on('skill:activated', (data) => {
  if (data.runnerId === this.rivalId) {
    this.reactToRivalSkill(data);
  }
});
```

## Debugging Events

### Log All Events

```typescript
// Quick debugging tool
class EventLoggerBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      // Listen to ALL events (not recommended for production!)
      const originalEmit = this.owner.engine.eventBus.emit.bind(
        this.owner.engine.eventBus
      );

      this.owner.engine.eventBus.emit = (event: any, ...args: any[]) => {
        console.log('[Event]', event, args);
        return originalEmit(event, ...args);
      };

      this.subscribed = true;
    }
  }
}
```

### Count Event Emissions

```typescript
class EventCounterBehavior extends Behavior {
  eventCounts = new Map<string, number>();

  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      const events = [
        'skill:activated',
        'phase:changed',
        'runner:finished',
      ];

      for (const eventName of events) {
        this.owner.engine.eventBus.on(eventName, () => {
          const count = this.eventCounts.get(eventName) || 0;
          this.eventCounts.set(eventName, count + 1);
        });
      }

      this.subscribed = true;
    }
  }
}
```

## Performance Considerations

### Event Bus is Fast

EventBus (via eventemitter3) is highly optimized. Don't worry about performance until you have evidence it's a problem.

### Avoid Event Storms

```typescript
// ❌ Bad: Emitting every tick for every runner
class PositionBehavior extends Behavior {
  override onUpdate(): void {
    this.owner?.engine?.eventBus.emit('runner:position', {
      runnerId: this.owner.id,
      position: this.position,
    });
    // With 18 runners at 15fps, that's 270 events/second!
  }
}

// ✅ Better: Emit only on significant changes
class PositionBehavior extends Behavior {
  lastEmittedPosition = 0;

  override onUpdate(): void {
    // Only emit when position changes by 10+ units
    if (Math.abs(this.position - this.lastEmittedPosition) >= 10) {
      this.owner?.engine?.eventBus.emit('runner:position', {
        runnerId: this.owner.id,
        position: this.position,
      });
      this.lastEmittedPosition = this.position;
    }
  }
}
```

## Common Mistakes

### Mistake 1: Forgetting to Store Handler Reference

```typescript
// ❌ Can't unsubscribe - new function each time
this.owner.engine.eventBus.on('event', () => {});
this.owner.engine.eventBus.off('event', () => {}); // Different function!

// ✅ Store reference
private handler = () => {};
this.owner.engine.eventBus.on('event', this.handler);
this.owner.engine.eventBus.off('event', this.handler); // Works!
```

### Mistake 2: Subscribing in Constructor/onAttach

```typescript
// ❌ Engine not available yet
class MyBehavior extends Behavior {
  constructor() {
    super();
    this.owner?.engine?.eventBus.on(...); // owner is null!
  }
}

// ✅ Subscribe in onUpdate
class MyBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on(...);
      this.subscribed = true;
    }
  }
}
```

### Mistake 3: Not Cleaning Up

```typescript
// ❌ Memory leak - listeners never removed
class MyBehavior extends Behavior {
  override onUpdate(): void {
    if (!this.subscribed && this.owner?.engine) {
      this.owner.engine.eventBus.on('event', this.handler);
      this.subscribed = true;
    }
  }
  // Missing onDetach cleanup!
}

// ✅ Always clean up
class MyBehavior extends Behavior {
  override onDetach(): void {
    this.owner?.engine?.eventBus.off('event', this.handler);
    super.onDetach();
  }
}
```

## Next Steps

You now understand event-driven communication! Ready for more?
- [Advanced Patterns](06-advanced-patterns.md) - Production-ready techniques
- [Best Practices](07-best-practices.md) - Design principles
- [API Reference](08-api-reference.md) - Complete event bus documentation

