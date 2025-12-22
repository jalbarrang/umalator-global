/**
 * Entity - Container for behaviors
 */

import type { Behavior } from './Behavior';
import type { GameEngine } from './GameEngine';
import type { BehaviorClass, IEntity } from './types';

/**
 * Entity is a container for Behaviors.
 *
 * Entities have identity and hold state relevant to their domain.
 * They manage their attached behaviors and propagate lifecycle events.
 *
 * Responsibilities:
 * - Own and manage attached Behaviors
 * - Call behavior lifecycle hooks in priority order
 * - Provide access to sibling behaviors
 *
 * @example
 * ```typescript
 * const entity = new Entity('runner-1');
 * entity.addBehavior(new MovementBehavior());
 * entity.addBehavior(new SkillBehavior());
 * engine.addEntity(entity);
 * ```
 */
export class Entity implements IEntity {
  /**
   * Unique identifier for this entity
   */
  readonly id: string;

  /**
   * Reference to the engine this entity belongs to (null if not added)
   */
  engine: GameEngine | null = null;

  /**
   * Whether this entity is enabled and should receive updates
   */
  enabled = true;

  /**
   * List of behaviors attached to this entity, sorted by priority
   */
  private behaviors: Array<Behavior> = [];

  constructor(id: string) {
    this.id = id;
  }

  /**
   * Attach a behavior to this entity
   * Behaviors are automatically sorted by priority (lower runs first)
   * @param behavior The behavior to attach
   */
  addBehavior(behavior: Behavior): void {
    if (this.behaviors.includes(behavior)) {
      return;
    }

    this.behaviors.push(behavior);
    this.behaviors.sort((a, b) => a.priority - b.priority);
    behavior.onAttach(this);
  }

  /**
   * Remove a behavior from this entity
   * @param behavior The behavior to remove
   */
  removeBehavior(behavior: Behavior): void {
    const index = this.behaviors.indexOf(behavior);
    if (index === -1) {
      return;
    }

    behavior.onDetach();
    this.behaviors.splice(index, 1);
  }

  /**
   * Get the first behavior of a specific type
   * @param behaviorClass The behavior class to search for
   * @returns The behavior instance or undefined if not found
   */
  getBehavior<T extends Behavior>(behaviorClass: BehaviorClass<T>): T | undefined {
    return this.behaviors.find((b) => b instanceof behaviorClass) as T | undefined;
  }

  /**
   * Check if this entity has a behavior of a specific type
   * @param behaviorClass The behavior class to check for
   * @returns True if the behavior is attached
   */
  hasBehavior<T extends Behavior>(behaviorClass: BehaviorClass<T>): boolean {
    return this.behaviors.some((b) => b instanceof behaviorClass);
  }

  /**
   * Get all behaviors attached to this entity
   * @returns Array of all behaviors
   */
  getBehaviors(): ReadonlyArray<Behavior> {
    return this.behaviors;
  }

  /**
   * Update all enabled behaviors in priority order
   * Called by GameEngine each tick
   * @param dt Delta time in seconds
   */
  update(dt: number): void {
    for (const behavior of this.behaviors) {
      if (behavior.enabled) {
        behavior.onUpdate(dt);
      }
    }
  }

  /**
   * Called when this entity is added to an engine
   * @param engine The engine this entity was added to
   */
  onAddedToEngine(engine: GameEngine): void {
    this.engine = engine;
  }

  /**
   * Called when this entity is removed from an engine
   */
  onRemovedFromEngine(): void {
    this.engine = null;
  }
}
