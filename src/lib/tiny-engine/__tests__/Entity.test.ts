/**
 * Unit tests for Entity container
 */

import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { Entity } from '../Entity';
import { Behavior } from '../Behavior';
import { GameEngine } from '../GameEngine';

describe('Entity', () => {
  let entity: Entity;

  beforeEach(() => {
    entity = new Entity('test-entity');
  });

  describe('initialization', () => {
    it('should create entity with id', () => {
      expect(entity.id).toBe('test-entity');
    });

    it('should start with no engine reference', () => {
      expect(entity.engine).toBeNull();
    });

    it('should start enabled', () => {
      expect(entity.enabled).toBe(true);
    });

    it('should start with no behaviors', () => {
      expect(entity.getBehaviors()).toHaveLength(0);
    });
  });

  describe('addBehavior', () => {
    it('should add behavior to entity', () => {
      const behavior = new Behavior();

      entity.addBehavior(behavior);

      expect(entity.getBehaviors()).toContain(behavior);
      expect(entity.getBehaviors()).toHaveLength(1);
    });

    it('should call behavior onAttach', () => {
      const behavior = new Behavior();
      const onAttachSpy = spyOn(behavior, 'onAttach');

      entity.addBehavior(behavior);

      expect(onAttachSpy).toHaveBeenCalledWith(entity);
      expect(onAttachSpy).toHaveBeenCalledTimes(1);
    });

    it('should set behavior owner', () => {
      const behavior = new Behavior();

      entity.addBehavior(behavior);

      expect(behavior.owner).toBe(entity);
    });

    it('should not add same behavior twice', () => {
      const behavior = new Behavior();

      entity.addBehavior(behavior);
      entity.addBehavior(behavior);

      expect(entity.getBehaviors()).toHaveLength(1);
    });

    it('should add multiple different behaviors', () => {
      const behavior1 = new Behavior();
      const behavior2 = new Behavior();
      const behavior3 = new Behavior();

      entity.addBehavior(behavior1);
      entity.addBehavior(behavior2);
      entity.addBehavior(behavior3);

      expect(entity.getBehaviors()).toHaveLength(3);
    });
  });

  describe('removeBehavior', () => {
    it('should remove behavior from entity', () => {
      const behavior = new Behavior();

      entity.addBehavior(behavior);
      expect(entity.getBehaviors()).toHaveLength(1);

      entity.removeBehavior(behavior);

      expect(entity.getBehaviors()).toHaveLength(0);
      expect(entity.getBehaviors()).not.toContain(behavior);
    });

    it('should call behavior onDetach', () => {
      const behavior = new Behavior();
      entity.addBehavior(behavior);

      const onDetachSpy = spyOn(behavior, 'onDetach');

      entity.removeBehavior(behavior);

      expect(onDetachSpy).toHaveBeenCalledTimes(1);
    });

    it('should clear behavior owner', () => {
      const behavior = new Behavior();

      entity.addBehavior(behavior);
      expect(behavior.owner).toBe(entity);

      entity.removeBehavior(behavior);

      expect(behavior.owner).toBeNull();
    });

    it('should handle removing non-existent behavior gracefully', () => {
      const behavior = new Behavior();

      expect(() => entity.removeBehavior(behavior)).not.toThrow();
      expect(entity.getBehaviors()).toHaveLength(0);
    });

    it('should only remove specified behavior', () => {
      const behavior1 = new Behavior();
      const behavior2 = new Behavior();
      const behavior3 = new Behavior();

      entity.addBehavior(behavior1);
      entity.addBehavior(behavior2);
      entity.addBehavior(behavior3);

      entity.removeBehavior(behavior2);

      expect(entity.getBehaviors()).toHaveLength(2);
      expect(entity.getBehaviors()).toContain(behavior1);
      expect(entity.getBehaviors()).not.toContain(behavior2);
      expect(entity.getBehaviors()).toContain(behavior3);
    });
  });

  describe('getBehavior', () => {
    it('should return behavior by type', () => {
      class TestBehavior extends Behavior {}
      const behavior = new TestBehavior();

      entity.addBehavior(behavior);

      const result = entity.getBehavior(TestBehavior);

      expect(result).toBe(behavior);
    });

    it('should return undefined when behavior not found', () => {
      class TestBehavior extends Behavior {}

      const result = entity.getBehavior(TestBehavior);

      expect(result).toBeUndefined();
    });

    it('should return first behavior when multiple of same type', () => {
      class TestBehavior extends Behavior {}
      const behavior1 = new TestBehavior();
      const behavior2 = new TestBehavior();

      entity.addBehavior(behavior1);
      entity.addBehavior(behavior2);

      const result = entity.getBehavior(TestBehavior);

      expect(result).toBe(behavior1);
    });

    it('should work with different behavior types', () => {
      class BehaviorA extends Behavior {}
      class BehaviorB extends Behavior {}

      const behaviorA = new BehaviorA();
      const behaviorB = new BehaviorB();

      entity.addBehavior(behaviorA);
      entity.addBehavior(behaviorB);

      expect(entity.getBehavior(BehaviorA)).toBe(behaviorA);
      expect(entity.getBehavior(BehaviorB)).toBe(behaviorB);
    });
  });

  describe('hasBehavior', () => {
    it('should return true when behavior exists', () => {
      class TestBehavior extends Behavior {}
      const behavior = new TestBehavior();

      entity.addBehavior(behavior);

      expect(entity.hasBehavior(TestBehavior)).toBe(true);
    });

    it('should return false when behavior does not exist', () => {
      class TestBehavior extends Behavior {}

      expect(entity.hasBehavior(TestBehavior)).toBe(false);
    });

    it('should work with multiple behaviors', () => {
      class BehaviorA extends Behavior {}
      class BehaviorB extends Behavior {}
      class BehaviorC extends Behavior {}

      entity.addBehavior(new BehaviorA());
      entity.addBehavior(new BehaviorB());

      expect(entity.hasBehavior(BehaviorA)).toBe(true);
      expect(entity.hasBehavior(BehaviorB)).toBe(true);
      expect(entity.hasBehavior(BehaviorC)).toBe(false);
    });
  });

  describe('priority ordering', () => {
    it('should sort behaviors by priority on add', () => {
      class LowPriorityBehavior extends Behavior {
        override priority = 10;
      }
      class HighPriorityBehavior extends Behavior {
        override priority = -10;
      }
      class MidPriorityBehavior extends Behavior {
        override priority = 0;
      }

      const low = new LowPriorityBehavior();
      const high = new HighPriorityBehavior();
      const mid = new MidPriorityBehavior();

      // Add in random order
      entity.addBehavior(low);
      entity.addBehavior(high);
      entity.addBehavior(mid);

      const behaviors = entity.getBehaviors();

      // Should be sorted: high (-10), mid (0), low (10)
      expect(behaviors[0]).toBe(high);
      expect(behaviors[1]).toBe(mid);
      expect(behaviors[2]).toBe(low);
    });

    it('should execute behaviors in priority order', () => {
      const executionOrder: Array<number> = [];

      class Behavior1 extends Behavior {
        override priority = 10;
        override onUpdate(): void {
          executionOrder.push(1);
        }
      }

      class Behavior2 extends Behavior {
        override priority = -10;
        override onUpdate(): void {
          executionOrder.push(2);
        }
      }

      class Behavior3 extends Behavior {
        override priority = 0;
        override onUpdate(): void {
          executionOrder.push(3);
        }
      }

      entity.addBehavior(new Behavior1());
      entity.addBehavior(new Behavior2());
      entity.addBehavior(new Behavior3());

      entity.update(0.016);

      // Should execute in priority order: 2 (-10), 3 (0), 1 (10)
      expect(executionOrder).toEqual([2, 3, 1]);
    });
  });

  describe('update', () => {
    it('should update all enabled behaviors', () => {
      const behavior1 = new Behavior();
      const behavior2 = new Behavior();
      const behavior3 = new Behavior();

      const spy1 = spyOn(behavior1, 'onUpdate');
      const spy2 = spyOn(behavior2, 'onUpdate');
      const spy3 = spyOn(behavior3, 'onUpdate');

      entity.addBehavior(behavior1);
      entity.addBehavior(behavior2);
      entity.addBehavior(behavior3);

      entity.update(0.016);

      expect(spy1).toHaveBeenCalledWith(0.016);
      expect(spy2).toHaveBeenCalledWith(0.016);
      expect(spy3).toHaveBeenCalledWith(0.016);
    });

    it('should skip disabled behaviors', () => {
      const behavior1 = new Behavior();
      const behavior2 = new Behavior();
      const behavior3 = new Behavior();

      behavior2.enabled = false;

      const spy1 = spyOn(behavior1, 'onUpdate');
      const spy2 = spyOn(behavior2, 'onUpdate');
      const spy3 = spyOn(behavior3, 'onUpdate');

      entity.addBehavior(behavior1);
      entity.addBehavior(behavior2);
      entity.addBehavior(behavior3);

      entity.update(0.016);

      expect(spy1).toHaveBeenCalled();
      expect(spy2).not.toHaveBeenCalled();
      expect(spy3).toHaveBeenCalled();
    });

    it('should pass correct dt to all behaviors', () => {
      const receivedDt: Array<number> = [];

      class TestBehavior extends Behavior {
        id: number;

        constructor(id: number) {
          super();
          this.id = id;
        }

        override onUpdate(dt: number): void {
          receivedDt.push(dt);
        }
      }

      entity.addBehavior(new TestBehavior(1));
      entity.addBehavior(new TestBehavior(2));
      entity.addBehavior(new TestBehavior(3));

      entity.update(0.033);

      expect(receivedDt).toEqual([0.033, 0.033, 0.033]);
    });
  });

  describe('engine lifecycle', () => {
    it('should set engine reference on onAddedToEngine', () => {
      const engine = new GameEngine();

      entity.onAddedToEngine(engine);

      expect(entity.engine).toBe(engine);
    });

    it('should clear engine reference on onRemovedFromEngine', () => {
      const engine = new GameEngine();

      entity.onAddedToEngine(engine);
      expect(entity.engine).toBe(engine);

      entity.onRemovedFromEngine();

      expect(entity.engine).toBeNull();
    });

    it('should be called when added to engine', () => {
      const engine = new GameEngine();
      const onAddedSpy = spyOn(entity, 'onAddedToEngine');

      engine.addEntity(entity);

      expect(onAddedSpy).toHaveBeenCalledWith(engine);
      expect(entity.engine).toBe(engine);
    });

    it('should be called when removed from engine', () => {
      const engine = new GameEngine();
      const onRemovedSpy = spyOn(entity, 'onRemovedFromEngine');

      engine.addEntity(entity);
      engine.removeEntity(entity);

      expect(onRemovedSpy).toHaveBeenCalledTimes(1);
      expect(entity.engine).toBeNull();
    });
  });

  describe('enabled property', () => {
    it('should allow disabling entity', () => {
      entity.enabled = false;

      expect(entity.enabled).toBe(false);
    });

    it('should not update when disabled', () => {
      const behavior = new Behavior();
      const spy = spyOn(behavior, 'onUpdate');

      entity.addBehavior(behavior);
      entity.enabled = false;

      const engine = new GameEngine();
      engine.addEntity(entity);
      engine.tick(0.016);

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty entity update', () => {
      expect(() => entity.update(0.016)).not.toThrow();
    });

    it('should handle behavior adding another behavior during update', () => {
      class Behavior2 extends Behavior {}
      const behavior2 = new Behavior2();

      class SelfModifyingBehavior extends Behavior {
        override onUpdate(): void {
          if (!this.owner?.hasBehavior(Behavior2)) {
            this.owner?.addBehavior(behavior2);
          }
        }
      }

      const behavior1 = new SelfModifyingBehavior();
      entity.addBehavior(behavior1);

      // First update adds behavior2
      entity.update(0.016);
      expect(entity.getBehaviors()).toHaveLength(2);

      // Second update doesn't add again
      entity.update(0.016);
      expect(entity.getBehaviors()).toHaveLength(2);
    });

    it('should handle behavior removing itself during update', () => {
      class SelfRemovingBehavior extends Behavior {
        updateCount = 0;

        override onUpdate(): void {
          this.updateCount++;
          if (this.updateCount >= 2 && this.owner) {
            this.owner.removeBehavior(this);
          }
        }
      }

      const behavior = new SelfRemovingBehavior();
      entity.addBehavior(behavior);

      entity.update(0.016);
      expect(entity.getBehaviors()).toHaveLength(1);

      entity.update(0.016);
      expect(entity.getBehaviors()).toHaveLength(0);

      // Should not crash on next update
      entity.update(0.016);
    });

    it('should handle multiple entities with same behavior types', () => {
      class TestBehavior extends Behavior {}

      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');

      const behavior1 = new TestBehavior();
      const behavior2 = new TestBehavior();

      entity1.addBehavior(behavior1);
      entity2.addBehavior(behavior2);

      expect(behavior1.owner).toBe(entity1);
      expect(behavior2.owner).toBe(entity2);
    });
  });
});
