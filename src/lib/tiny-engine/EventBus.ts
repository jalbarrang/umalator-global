/**
 * EventBus - Thin wrapper around eventemitter3 for decoupled communication
 */

import { EventEmitter } from 'eventemitter3';

/**
 * EventBus provides pub/sub communication between engine components.
 *
 * This is a thin wrapper around eventemitter3 that:
 * - Provides proper class ownership for stack traces and IDE navigation
 * - Allows future extension without breaking consumers
 * - Supports type-safe event maps via generics
 *
 * @example
 * ```typescript
 * type MyEvents = {
 *   'tick': { dt: number };
 *   'entityAdded': { id: string };
 * };
 *
 * const bus = new EventBus<MyEvents>();
 * bus.on('tick', (e) => console.log(e.dt));
 * bus.emit('tick', { dt: 0.016 });
 * ```
 */
export class EventBus<
  TEventTypes extends EventEmitter.ValidEventTypes = string | symbol,
> extends EventEmitter<TEventTypes> {
  constructor() {
    super();
  }
}
