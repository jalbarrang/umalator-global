# API Reference

Complete reference documentation for all Tiny Engine classes and methods.

## GameEngine

The main simulation loop orchestrator.

### Constructor

```typescript
new GameEngine()
```

Creates a new engine instance with fresh event bus and empty entity list.

**Example**:
```typescript
const engine = new GameEngine();
```

### Properties

#### `eventBus: EventBus` (readonly)

Global event bus for cross-entity communication.

**Example**:
```typescript
engine.eventBus.on('tick', (data) => console.log(data));
```

#### `time: number` (readonly)

Current simulation time in seconds.

**Example**:
```typescript
console.log(engine.time); // 5.432
```

#### `isRunning: boolean` (readonly)

Whether the simulation is currently executing.

**Example**:
```typescript
if (engine.isRunning) {
  console.log('Simulation in progress');
}
```

#### `entityCount: number` (readonly)

Number of entities currently in the engine.

**Example**:
```typescript
console.log(`Managing ${engine.entityCount} entities`);
```

### Methods

#### `addEntity(entity: Entity): void`

Registers an entity with the engine. Calls `entity.onAddedToEngine(this)` and emits `'entityAdded'` event.

**Parameters**:
- `entity` - The entity to add

**Example**:
```typescript
const runner = new Entity('runner-1');
engine.addEntity(runner);
```

**Notes**:
- Duplicate entities are ignored (no error thrown)
- Entity's `engine` property is set automatically

---

#### `removeEntity(entity: Entity): void`

Unregisters an entity from the engine. Calls `entity.onRemovedFromEngine()` and emits `'entityRemoved'` event.

**Parameters**:
- `entity` - The entity to remove

**Example**:
```typescript
engine.removeEntity(runner);
```

**Notes**:
- Removing non-existent entity is safe (no error thrown)
- Entity's `engine` property is set to `null` automatically

---

#### `getEntities<T extends Entity>(): T[]`

Returns all entities, optionally filtered by type.

**Type Parameters**:
- `T` - Entity type for filtering (optional)

**Returns**: Array of entities

**Example**:
```typescript
const allEntities = engine.getEntities();
const runners = engine.getEntities<Runner>();
```

---

#### `getEntityById(id: string): Entity | undefined`

Finds an entity by its ID.

**Parameters**:
- `id` - The entity ID to search for

**Returns**: The entity or `undefined` if not found

**Example**:
```typescript
const runner = engine.getEntityById('runner-1');
if (runner) {
  console.log('Found runner');
}
```

---

#### `tick(dt: number): void`

Single simulation step. Advances time by `dt` and updates all enabled entities.

**Parameters**:
- `dt` - Delta time in seconds

**Example**:
```typescript
engine.tick(0.016); // One frame at ~60fps
```

**Notes**:
- Time advances before entity updates
- Entities update in insertion order (deterministic)
- Disabled entities are skipped
- Emits `'tick'` event after all updates

---

#### `run(duration: number, dt: number): void`

Runs the simulation for a specified duration. Calls `tick(dt)` repeatedly until `time >= duration`.

**Parameters**:
- `duration` - Total simulation time in seconds
- `dt` - Delta time per tick in seconds

**Example**:
```typescript
engine.run(10.0, 0.0666); // 10 seconds at 15fps
```

**Notes**:
- Sets `isRunning` to `true` during execution
- Emits `'simulationStarted'` before first tick
- Emits `'simulationEnded'` after last tick
- Uses epsilon for floating-point precision

---

#### `reset(): void`

Resets engine to initial state. Removes all entities, resets time to 0, and clears event listeners.

**Example**:
```typescript
engine.reset();
console.log(engine.time);        // 0
console.log(engine.entityCount); // 0
```

**Notes**:
- Emits `'engineReset'` before clearing listeners
- Calls `onRemovedFromEngine()` on all entities
- Use for reusing engine instance across multiple runs

---

### Events

Events emitted by GameEngine:

#### `'entityAdded'`

Emitted when an entity is added.

**Payload**: `Entity`

```typescript
engine.eventBus.on('entityAdded', (entity) => {
  console.log('Added:', entity.id);
});
```

#### `'entityRemoved'`

Emitted when an entity is removed.

**Payload**: `Entity`

```typescript
engine.eventBus.on('entityRemoved', (entity) => {
  console.log('Removed:', entity.id);
});
```

#### `'tick'`

Emitted after each tick completes.

**Payload**: `{ time: number, dt: number }`

```typescript
engine.eventBus.on('tick', ({ time, dt }) => {
  console.log(`Tick at ${time}s (dt: ${dt})`);
});
```

#### `'simulationStarted'`

Emitted when `run()` begins.

**Payload**: `{ duration: number, dt: number }`

```typescript
engine.eventBus.on('simulationStarted', ({ duration, dt }) => {
  console.log(`Starting ${duration}s simulation at dt=${dt}`);
});
```

#### `'simulationEnded'`

Emitted when `run()` completes.

**Payload**: `{ finalTime: number }`

```typescript
engine.eventBus.on('simulationEnded', ({ finalTime }) => {
  console.log(`Ended at ${finalTime}s`);
});
```

#### `'engineReset'`

Emitted when `reset()` is called.

**Payload**: None

```typescript
engine.eventBus.on('engineReset', () => {
  console.log('Engine was reset');
});
```

---

## Entity

Container for behaviors with identity.

### Constructor

```typescript
new Entity(id: string)
```

Creates an entity with the specified ID.

**Parameters**:
- `id` - Unique identifier for this entity

**Example**:
```typescript
const runner = new Entity('runner-1');
const race = new Entity('race-simulator');
```

### Properties

#### `id: string` (readonly)

Unique identifier for this entity.

**Example**:
```typescript
console.log(entity.id); // 'runner-1'
```

#### `engine: GameEngine | null`

Reference to the engine this entity belongs to. `null` if not added to an engine.

**Example**:
```typescript
if (entity.engine) {
  entity.engine.eventBus.emit('event', data);
}
```

#### `enabled: boolean`

Whether this entity should receive updates.

**Example**:
```typescript
entity.enabled = false; // Stop updating
entity.enabled = true;  // Resume updating
```

### Methods

#### `addBehavior(behavior: Behavior): void`

Attaches a behavior to this entity. Behaviors are automatically sorted by priority.

**Parameters**:
- `behavior` - The behavior to attach

**Example**:
```typescript
const movement = new MovementBehavior();
entity.addBehavior(movement);
```

**Notes**:
- Calls `behavior.onAttach(this)`
- Sorts all behaviors by priority after adding
- Duplicate behaviors are ignored

---

#### `removeBehavior(behavior: Behavior): void`

Detaches a behavior from this entity.

**Parameters**:
- `behavior` - The behavior to remove

**Example**:
```typescript
entity.removeBehavior(movement);
```

**Notes**:
- Calls `behavior.onDetach()`
- Removing non-existent behavior is safe

---

#### `getBehavior<T extends Behavior>(behaviorClass: BehaviorClass<T>): T | undefined`

Gets the first behavior of a specific type.

**Type Parameters**:
- `T` - Behavior class type

**Parameters**:
- `behaviorClass` - The behavior class constructor

**Returns**: Behavior instance or `undefined`

**Example**:
```typescript
const movement = entity.getBehavior(MovementBehavior);
if (movement) {
  console.log(movement.position);
}
```

---

#### `hasBehavior<T extends Behavior>(behaviorClass: BehaviorClass<T>): boolean`

Checks if entity has a behavior of specific type.

**Type Parameters**:
- `T` - Behavior class type

**Parameters**:
- `behaviorClass` - The behavior class constructor

**Returns**: `true` if behavior is attached

**Example**:
```typescript
if (entity.hasBehavior(MovementBehavior)) {
  console.log('Entity can move');
}
```

---

#### `getBehaviors(): readonly Behavior[]`

Gets all behaviors attached to this entity.

**Returns**: Read-only array of all behaviors

**Example**:
```typescript
const behaviors = entity.getBehaviors();
console.log(`Has ${behaviors.length} behaviors`);
```

---

#### `update(dt: number): void`

Updates all enabled behaviors in priority order. Called by GameEngine each tick.

**Parameters**:
- `dt` - Delta time in seconds

**Example**:
```typescript
entity.update(0.016); // Manually update (usually engine does this)
```

**Notes**:
- Disabled behaviors are skipped
- Behaviors execute in priority order

---

#### `onAddedToEngine(engine: GameEngine): void`

Called when entity is added to an engine. Sets the `engine` property.

**Parameters**:
- `engine` - The engine this entity was added to

**Notes**:
- Usually called automatically by `engine.addEntity()`
- Can be overridden in subclasses for custom setup

---

#### `onRemovedFromEngine(): void`

Called when entity is removed from an engine. Clears the `engine` property.

**Notes**:
- Usually called automatically by `engine.removeEntity()`
- Can be overridden in subclasses for custom cleanup

---

## Behavior

Base class for all simulation logic.

### Constructor

```typescript
new Behavior()
```

Creates a behavior with default values.

**Example**:
```typescript
class MyBehavior extends Behavior {
  constructor() {
    super();
    this.priority = 10;
  }
}
```

### Properties

#### `owner: Entity | null`

The entity this behavior is attached to. `null` if not attached.

**Example**:
```typescript
const entityId = this.owner?.id;
```

#### `priority: number`

Execution priority. Lower values run first. Default: `0`.

**Example**:
```typescript
class HighPriorityBehavior extends Behavior {
  priority = -100; // Runs early
}

class LowPriorityBehavior extends Behavior {
  priority = 100; // Runs late
}
```

#### `enabled: boolean`

Whether this behavior should receive updates. Default: `true`.

**Example**:
```typescript
behavior.enabled = false; // Pause behavior
behavior.enabled = true;  // Resume behavior
```

### Methods

#### `onAttach(owner: Entity): void`

Called when behavior is attached to an entity.

**Parameters**:
- `owner` - The entity this behavior is being attached to

**Example**:
```typescript
class MyBehavior extends Behavior {
  override onAttach(owner: Entity): void {
    super.onAttach(owner); // Always call super!
    console.log(`Attached to ${owner.id}`);
  }
}
```

**Notes**:
- Sets `this.owner` property
- Override for custom initialization
- Engine reference not available yet!

---

#### `onDetach(): void`

Called when behavior is removed from an entity.

**Example**:
```typescript
class MyBehavior extends Behavior {
  override onDetach(): void {
    console.log('Cleaning up');
    super.onDetach(); // Always call super!
  }
}
```

**Notes**:
- Clears `this.owner` property
- Override for cleanup (event listeners, timers, etc.)

---

#### `onUpdate(dt: number): void`

Called each tick if behavior is enabled.

**Parameters**:
- `dt` - Delta time in seconds since last tick

**Example**:
```typescript
class MovementBehavior extends Behavior {
  position = 0;
  velocity = 10;

  override onUpdate(dt: number): void {
    this.position += this.velocity * dt;
  }
}
```

**Notes**:
- Override this method to implement behavior logic
- Not called if `enabled` is `false`
- Called in priority order within entity

---

## EventBus

Thin wrapper around EventEmitter3 for pub/sub communication.

### Constructor

```typescript
new EventBus<EventTypes>()
```

Creates a new event bus with optional type-safe event map.

**Type Parameters**:
- `EventTypes` - Event map type (optional)

**Example**:
```typescript
type MyEvents = {
  'tick': { time: number };
  'finish': { winner: string };
};

const bus = new EventBus<MyEvents>();
```

### Methods

#### `on(event, handler): this`

Subscribe to an event. Handler is called every time the event is emitted.

**Parameters**:
- `event` - Event name (string or symbol)
- `handler` - Callback function

**Returns**: `this` (for chaining)

**Example**:
```typescript
engine.eventBus.on('runner:moved', (data) => {
  console.log(`${data.id} moved to ${data.position}`);
});
```

---

#### `once(event, handler): this`

Subscribe to an event once. Handler is auto-removed after first call.

**Parameters**:
- `event` - Event name
- `handler` - Callback function

**Returns**: `this` (for chaining)

**Example**:
```typescript
engine.eventBus.once('race:started', () => {
  console.log('Race has started');
});
```

---

#### `off(event, handler): this`

Unsubscribe from an event.

**Parameters**:
- `event` - Event name
- `handler` - The same handler reference passed to `on()`

**Returns**: `this` (for chaining)

**Example**:
```typescript
const handler = (data) => console.log(data);
engine.eventBus.on('event', handler);
engine.eventBus.off('event', handler);
```

**Important**: Must use same handler reference to unsubscribe!

---

#### `emit(event, ...args): boolean`

Publish an event synchronously.

**Parameters**:
- `event` - Event name
- `...args` - Arguments passed to handlers

**Returns**: `true` if listeners exist, `false` otherwise

**Example**:
```typescript
engine.eventBus.emit('runner:moved', {
  id: 'runner-1',
  position: 1234,
  speed: 15.5,
});
```

**Notes**:
- Handlers execute synchronously
- Handlers execute in subscription order

---

#### `removeAllListeners(event?): this`

Clears all event listeners.

**Parameters**:
- `event` - Specific event to clear (optional, clears all if omitted)

**Returns**: `this` (for chaining)

**Example**:
```typescript
// Clear all listeners for specific event
engine.eventBus.removeAllListeners('tick');

// Clear ALL listeners
engine.eventBus.removeAllListeners();
```

---

#### `listenerCount(event): number`

Returns the number of listeners for an event.

**Parameters**:
- `event` - Event name

**Returns**: Number of listeners

**Example**:
```typescript
console.log(engine.eventBus.listenerCount('tick')); // 5
```

---

## Type Definitions

### IBehavior

Interface for behavior lifecycle:

```typescript
interface IBehavior {
  owner: Entity | null;
  priority: number;
  enabled: boolean;
  onAttach(owner: Entity): void;
  onDetach(): void;
  onUpdate(dt: number): void;
}
```

### IEntity

Interface for entity contract:

```typescript
interface IEntity {
  id: string;
  enabled: boolean;
  update(dt: number): void;
}
```

### BehaviorClass<T>

Constructor type for behavior type checking:

```typescript
type BehaviorClass<T extends IBehavior> = new (...args: any[]) => T;
```

**Usage**:
```typescript
function hasBehavior<T extends Behavior>(
  entity: Entity,
  behaviorClass: BehaviorClass<T>
): boolean {
  return entity.hasBehavior(behaviorClass);
}
```

---

## Common Patterns Reference

### Creating a Simulation

```typescript
// 1. Create engine
const engine = new GameEngine();

// 2. Create entities and behaviors
const entity = new Entity('entity-1');
entity.addBehavior(new MyBehavior());

// 3. Add to engine
engine.addEntity(entity);

// 4. Run
engine.run(duration, dt);

// 5. Extract results
const behavior = entity.getBehavior(MyBehavior);
console.log(behavior?.results);
```

### Event Communication

```typescript
// Publisher
this.owner?.engine?.eventBus.emit('eventName', payload);

// Subscriber (in onUpdate)
if (!this.subscribed && this.owner?.engine) {
  this.owner.engine.eventBus.on('eventName', (data) => {
    // Handle event
  });
  this.subscribed = true;
}

// Cleanup (in onDetach)
this.owner?.engine?.eventBus.off('eventName', this.handler);
```

### Accessing Other Behaviors

```typescript
// Within same entity
const other = this.owner?.getBehavior(OtherBehavior);
if (other) {
  // Use other.properties
}
```

### Priority Setup

```typescript
class EarlyBehavior extends Behavior {
  priority = -10; // Negative = run early
}

class LateBehavior extends Behavior {
  priority = 10; // Positive = run late
}
```

---

## Usage Examples

### Complete Racing Simulation

```typescript
// Setup
const engine = new GameEngine();
const race = new RaceSimulator(courseData);
engine.addEntity(race);

for (let i = 0; i < 18; i++) {
  const runner = new Runner(`runner-${i}`, params[i]);
  engine.addEntity(runner);
}

// Subscribe to race events
engine.eventBus.on('runner:finished', (data) => {
  console.log(`${data.id} finished at ${data.time}s`);
});

// Run at 15 FPS (game's frame rate)
engine.run(raceTime, 0.0666);

// Get results
const winner = race.getBehavior(RaceEndBehavior)?.winnerId;
console.log('Winner:', winner);
```

### Monte Carlo Batch

```typescript
function runBatch(seeds: number[]): Result[] {
  return seeds.map((seed) => {
    const engine = new GameEngine();
    const rng = new SeededRng(seed);
    const runner = new Runner('runner-1', params, rng);

    engine.addEntity(runner);
    engine.run(duration, 0.0666);

    const movement = runner.getBehavior(MovementBehavior);
    return {
      seed,
      position: movement?.position || 0,
      time: engine.time,
    };
  });
}

const results = runBatch(generateSeeds(10000));
```

---

## See Also

- [Introduction](01-introduction.md) - Overview and quick start
- [Core Concepts](02-core-concepts.md) - Understanding the four pillars
- [Your First Simulation](03-your-first-simulation.md) - Hands-on tutorial
- [Behaviors](04-behaviors.md) - Behavior patterns and lifecycle
- [Events](05-events.md) - Event-driven architecture
- [Advanced Patterns](06-advanced-patterns.md) - Production techniques
- [Best Practices](07-best-practices.md) - Design principles

