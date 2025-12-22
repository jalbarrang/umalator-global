/**
 * Unit tests for Behavior base class
 */

import { describe, expect, it, spyOn } from 'bun:test';
import { Behavior } from '../Behavior';
import { Entity } from '../Entity';

describe('Behavior', () => {
  describe('initialization', () => {
    it('should initialize with default values', () => {
      const behavior = new Behavior();

      expect(behavior.owner).toBeNull();
      expect(behavior.priority).toBe(0);
      expect(behavior.enabled).toBe(true);
    });

    it('should allow custom priority in subclass', () => {
      class HighPriorityBehavior extends Behavior {
        override priority = -10;
      }

      const behavior = new HighPriorityBehavior();
      expect(behavior.priority).toBe(-10);
    });
  });

  describe('onAttach', () => {
    it('should set owner when attached to entity', () => {
      const behavior = new Behavior();
      const entity = new Entity('test-entity');

      behavior.onAttach(entity);

      expect(behavior.owner).toBe(entity);
    });

    it('should be called when added to entity', () => {
      const behavior = new Behavior();
      const onAttachSpy = spyOn(behavior, 'onAttach');
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);

      expect(onAttachSpy).toHaveBeenCalledWith(entity);
      expect(onAttachSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow subclass to override onAttach', () => {
      let customAttachCalled = false;

      class CustomBehavior extends Behavior {
        override onAttach(owner: Entity): void {
          super.onAttach(owner);
          customAttachCalled = true;
        }
      }

      const behavior = new CustomBehavior();
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);

      expect(customAttachCalled).toBe(true);
      expect(behavior.owner).toBe(entity);
    });
  });

  describe('onDetach', () => {
    it('should clear owner when detached', () => {
      const behavior = new Behavior();
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);
      expect(behavior.owner).toBe(entity);

      behavior.onDetach();

      expect(behavior.owner).toBeNull();
    });

    it('should be called when removed from entity', () => {
      const behavior = new Behavior();
      const onDetachSpy = spyOn(behavior, 'onDetach');
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);
      entity.removeBehavior(behavior);

      expect(onDetachSpy).toHaveBeenCalledTimes(1);
      expect(behavior.owner).toBeNull();
    });

    it('should allow subclass to override onDetach', () => {
      let customDetachCalled = false;

      class CustomBehavior extends Behavior {
        override onDetach(): void {
          customDetachCalled = true;
          super.onDetach();
        }
      }

      const behavior = new CustomBehavior();
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);
      entity.removeBehavior(behavior);

      expect(customDetachCalled).toBe(true);
      expect(behavior.owner).toBeNull();
    });
  });

  describe('onUpdate', () => {
    it('should be called during entity update', () => {
      const behavior = new Behavior();
      const onUpdateSpy = spyOn(behavior, 'onUpdate');
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);
      entity.update(0.016);

      expect(onUpdateSpy).toHaveBeenCalledWith(0.016);
      expect(onUpdateSpy).toHaveBeenCalledTimes(1);
    });

    it('should receive correct dt value', () => {
      let receivedDt = 0;

      class TestBehavior extends Behavior {
        override onUpdate(dt: number): void {
          receivedDt = dt;
        }
      }

      const behavior = new TestBehavior();
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);
      entity.update(0.033);

      expect(receivedDt).toBe(0.033);
    });

    it('should allow stateful behavior updates', () => {
      class CounterBehavior extends Behavior {
        count = 0;

        override onUpdate(dt: number): void {
          this.count += 1;
        }
      }

      const behavior = new CounterBehavior();
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);

      entity.update(0.016);
      expect(behavior.count).toBe(1);

      entity.update(0.016);
      expect(behavior.count).toBe(2);

      entity.update(0.016);
      expect(behavior.count).toBe(3);
    });
  });

  describe('enabled property', () => {
    it('should not update when disabled', () => {
      const behavior = new Behavior();
      const onUpdateSpy = spyOn(behavior, 'onUpdate');
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);
      behavior.enabled = false;

      entity.update(0.016);

      expect(onUpdateSpy).not.toHaveBeenCalled();
    });

    it('should resume updates when re-enabled', () => {
      class CounterBehavior extends Behavior {
        count = 0;

        override onUpdate(dt: number): void {
          this.count += 1;
        }
      }

      const behavior = new CounterBehavior();
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);

      // Update while enabled
      entity.update(0.016);
      expect(behavior.count).toBe(1);

      // Disable and update
      behavior.enabled = false;
      entity.update(0.016);
      expect(behavior.count).toBe(1); // No change

      // Re-enable and update
      behavior.enabled = true;
      entity.update(0.016);
      expect(behavior.count).toBe(2); // Resumed
    });
  });

  describe('priority property', () => {
    it('should allow custom priority values', () => {
      class LowPriorityBehavior extends Behavior {
        override priority = 100;
      }

      class HighPriorityBehavior extends Behavior {
        override priority = -100;
      }

      const lowPriority = new LowPriorityBehavior();
      const highPriority = new HighPriorityBehavior();

      expect(lowPriority.priority).toBe(100);
      expect(highPriority.priority).toBe(-100);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple attach/detach cycles', () => {
      const behavior = new Behavior();
      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');

      // First attach
      entity1.addBehavior(behavior);
      expect(behavior.owner).toBe(entity1);

      // Detach
      entity1.removeBehavior(behavior);
      expect(behavior.owner).toBeNull();

      // Second attach to different entity
      entity2.addBehavior(behavior);
      expect(behavior.owner).toBe(entity2);

      // Detach again
      entity2.removeBehavior(behavior);
      expect(behavior.owner).toBeNull();
    });

    it('should not break when onUpdate does nothing', () => {
      const behavior = new Behavior();
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);

      // Should not throw
      expect(() => entity.update(0.016)).not.toThrow();
    });

    it('should handle being disabled during update', () => {
      class SelfDisablingBehavior extends Behavior {
        updateCount = 0;

        override onUpdate(dt: number): void {
          this.updateCount += 1;
          if (this.updateCount >= 3) {
            this.enabled = false;
          }
        }
      }

      const behavior = new SelfDisablingBehavior();
      const entity = new Entity('test-entity');

      entity.addBehavior(behavior);

      entity.update(0.016);
      expect(behavior.updateCount).toBe(1);

      entity.update(0.016);
      expect(behavior.updateCount).toBe(2);

      entity.update(0.016);
      expect(behavior.updateCount).toBe(3);
      expect(behavior.enabled).toBe(false);

      // Should not update anymore
      entity.update(0.016);
      expect(behavior.updateCount).toBe(3);
    });
  });
});
