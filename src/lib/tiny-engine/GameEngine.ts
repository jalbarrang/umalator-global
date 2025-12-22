/**
 * GameEngine - The main loop orchestrator
 */

import { EventBus } from './EventBus';
import type { Entity } from './Entity';

/**
 * GameEngine is the core simulation loop that manages entities and time.
 *
 * The engine is completely game-agnostic - it knows nothing about racing,
 * skills, or HP. It only knows:
 * - Entities exist
 * - Behaviors update each tick
 * - Events can be published/subscribed
 *
 * Responsibilities:
 * - Iterate all entities each tick in insertion order
 * - Advance simulation time
 * - Provide access to the shared EventBus
 * - NOT responsible for: domain logic, rendering, input
 *
 * Design Principles:
 * - Deterministic execution (consistent iteration order, explicit dt)
 * - No internal RNG (never calls Math.random())
 * - Minimal API surface
 *
 * @example
 * ```typescript
 * const engine = new GameEngine();
 * const entity = new Entity('test');
 * entity.addBehavior(new MyBehavior());
 *
 * engine.addEntity(entity);
 * engine.run(10.0, 0.016); // Run for 10 seconds at ~60fps
 * ```
 */
export class GameEngine {
  /**
   * Global event bus for cross-entity communication
   */
  readonly eventBus: EventBus;

  /**
   * List of entities managed by this engine
   */
  private entities: Array<Entity> = [];

  /**
   * Current simulation time in seconds
   */
  private _time = 0;

  /**
   * Whether the simulation is currently running
   */
  private _isRunning = false;

  constructor() {
    this.eventBus = new EventBus();
  }

  /**
   * Get the current simulation time
   */
  get time(): number {
    return this._time;
  }

  /**
   * Get whether the simulation is currently running
   */
  get isRunning(): boolean {
    return this._isRunning;
  }

  /**
   * Add an entity to the engine
   * @param entity The entity to add
   */
  addEntity(entity: Entity): void {
    if (this.entities.includes(entity)) {
      return;
    }

    this.entities.push(entity);
    entity.onAddedToEngine(this);
    this.eventBus.emit('entityAdded', entity);
  }

  /**
   * Remove an entity from the engine
   * @param entity The entity to remove
   */
  removeEntity(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index === -1) {
      return;
    }

    entity.onRemovedFromEngine();
    this.entities.splice(index, 1);
    this.eventBus.emit('entityRemoved', entity);
  }

  /**
   * Get all entities, optionally filtered by type
   * @returns Array of all entities
   */
  getEntities<T extends Entity = Entity>(): Array<T> {
    return this.entities as Array<T>;
  }

  /**
   * Find an entity by ID
   * @param id The entity ID to search for
   * @returns The entity or undefined if not found
   */
  getEntityById(id: string): Entity | undefined {
    return this.entities.find((e) => e.id === id);
  }

  /**
   * Single simulation step
   * Advances time and updates all enabled entities
   * @param dt Delta time in seconds
   */
  tick(dt: number): void {
    this._time += dt;

    // Update all enabled entities in insertion order (deterministic)
    for (const entity of this.entities) {
      if (entity.enabled) {
        entity.update(dt);
      }
    }

    this.eventBus.emit('tick', { time: this._time, dt });
  }

  /**
   * Run the simulation for a specified duration
   * Calls tick(dt) repeatedly until time >= duration
   * @param duration Total simulation time in seconds
   * @param dt Delta time per tick in seconds
   */
  run(duration: number, dt: number): void {
    this._isRunning = true;
    this.eventBus.emit('simulationStarted', { duration, dt });

    // Use a small epsilon for floating point comparison to avoid extra ticks
    const epsilon = dt * 0.001;
    while (this._time < duration - epsilon) {
      this.tick(dt);
    }

    this._isRunning = false;
    this.eventBus.emit('simulationEnded', { finalTime: this._time });
  }

  /**
   * Reset the engine to initial state
   * Clears all entities, resets time, and clears event listeners
   */
  reset(): void {
    // Emit reset event before clearing listeners so they can receive it
    this.eventBus.emit('engineReset');

    // Remove all entities (triggers onRemovedFromEngine)
    const entitiesToRemove = [...this.entities];
    for (const entity of entitiesToRemove) {
      this.removeEntity(entity);
    }

    // Reset time
    this._time = 0;
    this._isRunning = false;

    // Clear all event listeners
    this.eventBus.removeAllListeners();
  }

  /**
   * Get current entity count
   */
  get entityCount(): number {
    return this.entities.length;
  }
}
