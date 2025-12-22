/**
 * Shared type definitions for Tiny Engine
 */

import type { Entity } from './Entity';

/**
 * Behavior lifecycle interface
 */
export interface IBehavior {
  owner: Entity | null;
  priority: number;
  enabled: boolean;
  onAttach: (owner: Entity) => void;
  onDetach: () => void;
  onUpdate: (dt: number) => void;
}

/**
 * Entity interface contract
 */
export interface IEntity {
  id: string;
  enabled: boolean;
  update: (dt: number) => void;
}

/**
 * Constructor type for behavior class type checking
 */
export type BehaviorClass<T extends IBehavior> = new (...args: Array<any>) => T;
