/**
 * Behavior - The unit of logic in Tiny Engine
 */

import type { Entity } from './Entity';
import type { IBehavior } from './types';

/**
 * Base class for all behaviors.
 *
 * Behaviors are attached to Entities and implement specific functionality.
 * They are updated each tick in priority order (lower priority runs first).
 *
 * Design Principles:
 * - Behaviors should be stateless or own only their local state
 * - Behaviors communicate via EventBus, not direct references
 * - Behaviors can access `owner.engine.eventBus` for pub/sub
 * - Behaviors should be small and focused (Single Responsibility)
 *
 * @example
 * ```typescript
 * class CounterBehavior extends Behavior {
 *   count = 0;
 *
 *   onUpdate(dt: number) {
 *     this.count++;
 *     if (this.count % 10 === 0) {
 *       this.owner?.engine?.eventBus.emit('counter:milestone', { count: this.count });
 *     }
 *   }
 * }
 * ```
 */
export class Behavior implements IBehavior {
  /**
   * The entity this behavior is attached to (null if not attached)
   */
  owner: Entity | null = null;

  /**
   * Execution priority - lower values run first (default: 0)
   */
  priority = 0;

  /**
   * Whether this behavior is enabled and should receive updates
   */
  enabled = true;

  /**
   * Called when this behavior is attached to an entity
   * @param owner The entity this behavior is being attached to
   */
  onAttach(owner: Entity): void {
    this.owner = owner;
  }

  /**
   * Called when this behavior is detached from an entity
   */
  onDetach(): void {
    this.owner = null;
  }

  /**
   * Called each tick if this behavior is enabled
   * @param dt Delta time in seconds since last tick
   */
  onUpdate(dt: number): void {
    // Override in subclasses
  }
}
