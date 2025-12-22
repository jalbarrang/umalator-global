# Tiny Engine

A minimal, headless game engine for tick-based simulations with Monte Carlo capabilities.

## Overview

Tiny Engine provides a lightweight, game-agnostic foundation for running deterministic, tick-based simulations. It is designed for:

- **Headless execution**: No rendering, pure logic simulation
- **Monte Carlo analysis**: Deterministic RNG seeding for reproducible runs
- **Composition over inheritance**: Entity-Component pattern via Behaviors
- **Event-driven communication**: Decoupled systems via EventBus

---

## Core Concepts

### GameEngine

The main loop orchestrator. Manages entities, dispatches ticks, and owns the global event bus.

```
GameEngine
├── entities: Entity[]
├── eventBus: EventBus
├── time: number
├── isRunning: boolean
│
├── addEntity(entity): void
├── removeEntity(entity): void
├── getEntities<T>(): T[]
│
├── tick(dt: number): void      // Single simulation step
├── run(duration: number, dt: number): void  // Run until duration
├── reset(): void               // Reset time, clear entities
```

**Responsibilities**:

- Iterate all entities each tick in insertion order (or priority if needed)
- Advance simulation time
- Provide access to the shared EventBus
- NOT responsible for: domain logic, rendering, input

---

### Entity

A container for Behaviors. Entities have identity and hold state relevant to their domain.

```
Entity
├── id: string
├── behaviors: Behavior[]
├── engine: GameEngine | null   // Set when added to engine
├── enabled: boolean
│
├── addBehavior(behavior): void
├── removeBehavior(behavior): void
├── getBehavior<T>(type): T | undefined
├── hasBehavior(type): boolean
│
├── update(dt: number): void    // Called by GameEngine each tick
├── onAddedToEngine(engine): void
├── onRemovedFromEngine(): void
```

**Responsibilities**:

- Own and manage its attached Behaviors
- Call behavior lifecycle hooks in priority order
- Provide access to sibling behaviors

---

### Behavior

The unit of logic. Behaviors are attached to Entities and implement specific functionality.

```
Behavior
├── owner: Entity | null
├── priority: number            // Lower = runs first (default: 0)
├── enabled: boolean
│
├── onAttach(owner: Entity): void
├── onDetach(): void
├── onUpdate(dt: number): void
```

**Design Principles**:

- Behaviors should be stateless or own only their local state
- Behaviors communicate via EventBus, not direct references
- Behaviors can access `owner.engine.eventBus` for pub/sub
- Behaviors should be small and focused (Single Responsibility)

---

### EventBus

A thin wrapper around [`eventemitter3`](https://github.com/primus/eventemitter3) for decoupled communication. We use eventemitter3 directly rather than reimplementing pub/sub—it's battle-tested, fast, and has zero dependencies.

```
EventBus (extends EventEmitter)
├── on(event, handler): this           // Subscribe to event
├── once(event, handler): this         // Subscribe once
├── off(event, handler): this          // Unsubscribe specific handler
├── emit(event, ...args): boolean      // Publish event synchronously
├── removeAllListeners(event?): this   // Clear subscribers
```

**Event Naming Convention**:

- Use past tense for things that happened: `'entityAdded'`, `'tickCompleted'`
- Use namespacing for domain events: `'race:phaseChanged'`, `'skill:activated'`

**Type Safety**:

For strongly-typed events, define an event map and use it with the emitter:

```typescript
type RaceEvents = {
  'phase:changed': { oldPhase: number; newPhase: number };
  'skill:activated': { runnerId: string; skillId: string };
};

// EventBus can be typed via generics if needed
const bus = new EventEmitter<RaceEvents>();
bus.emit('phase:changed', { oldPhase: 0, newPhase: 1 });
```

---

## Design Principles

### 1. Game-Agnostic Core

The engine knows nothing about racing, skills, or HP. Domain concepts belong in the consuming layer (`racing/`). The engine only knows:

- Entities exist
- Behaviors update each tick
- Events can be published/subscribed

### 2. Deterministic Execution

For Monte Carlo simulations, determinism is critical:

- **No internal RNG**: Engine never calls `Math.random()`
- **Consistent iteration order**: Entities update in predictable order
- **Time is explicit**: `dt` is passed in, not derived from wall clock

### 3. Composable and Extensible

- Add new behaviors without modifying Entity or GameEngine
- Swap behaviors at runtime (enable/disable)
- Stack behaviors with priority ordering

### 4. Minimal API Surface

Only expose what's necessary. Avoid:

- Lifecycle bloat (no `onPreUpdate`, `onPostUpdate`, etc.)
- Built-in physics, rendering, or input
- Opinionated state management

---

## Monte Carlo Considerations

### Seeded RNG

The engine does NOT provide RNG. Consumers should:

1. Create a seeded PRNG instance per simulation run
2. Pass the PRNG to behaviors that need randomness
3. Use the same seed to reproduce results

```typescript
// Example usage in racing domain
const rng = new SeededRNG(seed);
const runner = new Runner(rng);
engine.addEntity(runner);
```

### Batch Execution

For running thousands of simulations:

```typescript
function runMonteCarlo(seeds: number[], setup: (seed: number) => GameEngine) {
  return seeds.map((seed) => {
    const engine = setup(seed);
    engine.run(duration, dt);
    return extractResults(engine);
  });
}
```

### Determinism Checklist

- [ ] All RNG is seeded and passed explicitly
- [ ] No dependency on wall-clock time
- [ ] No async operations during simulation
- [ ] Entity/behavior iteration order is stable
- [ ] Event handlers execute synchronously (eventemitter3 guarantees this)

---

## API Reference

### GameEngine

| Method                            | Description                                              |
| --------------------------------- | -------------------------------------------------------- |
| `constructor()`                   | Creates engine with empty entity list and fresh EventBus |
| `addEntity(entity)`               | Registers entity, calls `onAddedToEngine`                |
| `removeEntity(entity)`            | Unregisters entity, calls `onRemovedFromEngine`          |
| `getEntities<T extends Entity>()` | Returns all entities (optionally filtered by type)       |
| `tick(dt)`                        | Advances time by `dt`, updates all enabled entities      |
| `run(duration, dt)`               | Calls `tick(dt)` until `time >= duration`                |
| `reset()`                         | Clears entities, resets time to 0, clears event bus      |

### Entity

| Method                          | Description                                            |
| ------------------------------- | ------------------------------------------------------ |
| `addBehavior(behavior)`         | Attaches behavior, calls `onAttach`, sorts by priority |
| `removeBehavior(behavior)`      | Detaches behavior, calls `onDetach`                    |
| `getBehavior<T>(BehaviorClass)` | Returns first behavior of given type                   |
| `update(dt)`                    | Iterates enabled behaviors, calls `onUpdate(dt)`       |

### Behavior

| Method            | Description                        |
| ----------------- | ---------------------------------- |
| `onAttach(owner)` | Called when added to an entity     |
| `onDetach()`      | Called when removed from an entity |
| `onUpdate(dt)`    | Called each tick if enabled        |

### EventBus (via eventemitter3)

| Method                       | Description                                   |
| ---------------------------- | --------------------------------------------- |
| `on(event, handler)`         | Subscribe to event, returns `this` for chain  |
| `once(event, handler)`       | Subscribe once, auto-removes after first call |
| `off(event, handler)`        | Unsubscribe specific handler                  |
| `emit(event, ...args)`       | Publish event synchronously, returns boolean  |
| `removeAllListeners(event?)` | Clear all or specific event subscribers       |
| `listenerCount(event)`       | Returns number of listeners for event         |

---

## Usage Example

```typescript
import { GameEngine, Entity, Behavior } from 'tiny-engine';

// Define a behavior
class CounterBehavior extends Behavior {
  count = 0;

  onUpdate(dt: number) {
    this.count += 1;
    if (this.count % 10 === 0) {
      this.owner.engine.eventBus.emit('counter:milestone', { count: this.count });
    }
  }
}

// Create entity with behavior
const entity = new Entity('counter-1');
entity.addBehavior(new CounterBehavior());

// Setup engine
const engine = new GameEngine();
engine.eventBus.on('counter:milestone', (e) => console.log('Milestone:', e.count));
engine.addEntity(entity);

// Run simulation
engine.run(100, 1); // 100 ticks of dt=1
```

---

## Dependencies

- [`eventemitter3`](https://github.com/primus/eventemitter3) - Fast, typed event emitter (0 dependencies)

---

## File Structure

```
tiny-engine/
├── GameEngine.ts     // Main loop, entity management
├── Entity.ts         // Behavior container
├── Behavior.ts       // Base behavior class
├── EventBus.ts       // Re-export of eventemitter3 with optional typing helpers
├── types.ts          // Shared type definitions
└── README.md         // This document
```

---

## Future Considerations

- **Priority groups**: Run certain behaviors before/after others (e.g., physics before rendering)
- **Entity queries**: Efficient lookup by tag or component type
- **Pooling**: Reuse entities for high-frequency simulations
- **Parallel execution**: Web Workers for batch Monte Carlo runs

These are NOT in scope for the initial implementation.
