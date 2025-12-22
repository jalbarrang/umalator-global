/**
 * Unit tests for GameEngine main loop
 */

import { beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { GameEngine } from '../GameEngine';
import { Entity } from '../Entity';
import { Behavior } from '../Behavior';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('initialization', () => {
    it('should create engine with event bus', () => {
      expect(engine.eventBus).toBeDefined();
    });

    it('should start with time 0', () => {
      expect(engine.time).toBe(0);
    });

    it('should start not running', () => {
      expect(engine.isRunning).toBe(false);
    });

    it('should start with no entities', () => {
      expect(engine.entityCount).toBe(0);
      expect(engine.getEntities()).toHaveLength(0);
    });
  });

  describe('addEntity', () => {
    it('should add entity to engine', () => {
      const entity = new Entity('test');

      engine.addEntity(entity);

      expect(engine.entityCount).toBe(1);
      expect(engine.getEntities()).toContain(entity);
    });

    it('should call entity onAddedToEngine', () => {
      const entity = new Entity('test');
      const spy = spyOn(entity, 'onAddedToEngine');

      engine.addEntity(entity);

      expect(spy).toHaveBeenCalledWith(engine);
      expect(entity.engine).toBe(engine);
    });

    it('should emit entityAdded event', () => {
      const entity = new Entity('test');
      const handler = mock();

      engine.eventBus.on('entityAdded', handler);
      engine.addEntity(entity);

      expect(handler).toHaveBeenCalledWith(entity);
    });

    it('should not add same entity twice', () => {
      const entity = new Entity('test');

      engine.addEntity(entity);
      engine.addEntity(entity);

      expect(engine.entityCount).toBe(1);
    });

    it('should add multiple entities', () => {
      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');
      const entity3 = new Entity('entity-3');

      engine.addEntity(entity1);
      engine.addEntity(entity2);
      engine.addEntity(entity3);

      expect(engine.entityCount).toBe(3);
    });
  });

  describe('removeEntity', () => {
    it('should remove entity from engine', () => {
      const entity = new Entity('test');

      engine.addEntity(entity);
      expect(engine.entityCount).toBe(1);

      engine.removeEntity(entity);

      expect(engine.entityCount).toBe(0);
      expect(engine.getEntities()).not.toContain(entity);
    });

    it('should call entity onRemovedFromEngine', () => {
      const entity = new Entity('test');
      engine.addEntity(entity);

      const spy = spyOn(entity, 'onRemovedFromEngine');

      engine.removeEntity(entity);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(entity.engine).toBeNull();
    });

    it('should emit entityRemoved event', () => {
      const entity = new Entity('test');
      const handler = mock();

      engine.addEntity(entity);
      engine.eventBus.on('entityRemoved', handler);
      engine.removeEntity(entity);

      expect(handler).toHaveBeenCalledWith(entity);
    });

    it('should handle removing non-existent entity gracefully', () => {
      const entity = new Entity('test');

      expect(() => engine.removeEntity(entity)).not.toThrow();
    });

    it('should only remove specified entity', () => {
      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');
      const entity3 = new Entity('entity-3');

      engine.addEntity(entity1);
      engine.addEntity(entity2);
      engine.addEntity(entity3);

      engine.removeEntity(entity2);

      expect(engine.entityCount).toBe(2);
      expect(engine.getEntities()).toContain(entity1);
      expect(engine.getEntities()).not.toContain(entity2);
      expect(engine.getEntities()).toContain(entity3);
    });
  });

  describe('getEntities', () => {
    it('should return empty array when no entities', () => {
      expect(engine.getEntities()).toEqual([]);
    });

    it('should return all entities', () => {
      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');

      engine.addEntity(entity1);
      engine.addEntity(entity2);

      const entities = engine.getEntities();

      expect(entities).toHaveLength(2);
      expect(entities).toContain(entity1);
      expect(entities).toContain(entity2);
    });

    it('should support type filtering', () => {
      class SpecialEntity extends Entity {}

      const normalEntity = new Entity('normal');
      const specialEntity = new SpecialEntity('special');

      engine.addEntity(normalEntity);
      engine.addEntity(specialEntity);

      const allEntities = engine.getEntities();
      expect(allEntities).toHaveLength(2);

      const specialEntities = engine.getEntities<SpecialEntity>();
      expect(specialEntities).toContain(specialEntity);
    });
  });

  describe('getEntityById', () => {
    it('should return entity by id', () => {
      const entity = new Entity('test-id');

      engine.addEntity(entity);

      const result = engine.getEntityById('test-id');

      expect(result).toBe(entity);
    });

    it('should return undefined when entity not found', () => {
      const result = engine.getEntityById('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should find correct entity among multiple', () => {
      const entity1 = new Entity('id-1');
      const entity2 = new Entity('id-2');
      const entity3 = new Entity('id-3');

      engine.addEntity(entity1);
      engine.addEntity(entity2);
      engine.addEntity(entity3);

      expect(engine.getEntityById('id-2')).toBe(entity2);
    });
  });

  describe('tick', () => {
    it('should advance time by dt', () => {
      engine.tick(0.016);
      expect(engine.time).toBeCloseTo(0.016);

      engine.tick(0.016);
      expect(engine.time).toBeCloseTo(0.032);

      engine.tick(0.033);
      expect(engine.time).toBeCloseTo(0.065);
    });

    it('should update all enabled entities', () => {
      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');

      const spy1 = spyOn(entity1, 'update');
      const spy2 = spyOn(entity2, 'update');

      engine.addEntity(entity1);
      engine.addEntity(entity2);

      engine.tick(0.016);

      expect(spy1).toHaveBeenCalledWith(0.016);
      expect(spy2).toHaveBeenCalledWith(0.016);
    });

    it('should skip disabled entities', () => {
      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');

      entity2.enabled = false;

      const spy1 = spyOn(entity1, 'update');
      const spy2 = spyOn(entity2, 'update');

      engine.addEntity(entity1);
      engine.addEntity(entity2);

      engine.tick(0.016);

      expect(spy1).toHaveBeenCalled();
      expect(spy2).not.toHaveBeenCalled();
    });

    it('should emit tick event', () => {
      const handler = mock();

      engine.eventBus.on('tick', handler);
      engine.tick(0.016);

      expect(handler).toHaveBeenCalledWith({ time: 0.016, dt: 0.016 });
    });

    it('should maintain deterministic iteration order', () => {
      const executionOrder: Array<string> = [];

      class TrackerBehavior extends Behavior {
        constructor(private name: string) {
          super();
        }

        override onUpdate(): void {
          executionOrder.push(this.name);
        }
      }

      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');
      const entity3 = new Entity('entity-3');

      entity1.addBehavior(new TrackerBehavior('e1'));
      entity2.addBehavior(new TrackerBehavior('e2'));
      entity3.addBehavior(new TrackerBehavior('e3'));

      // Add in specific order
      engine.addEntity(entity1);
      engine.addEntity(entity2);
      engine.addEntity(entity3);

      // Run multiple times
      for (let i = 0; i < 3; i++) {
        executionOrder.length = 0;
        engine.tick(0.016);
        // Should always be in insertion order
        expect(executionOrder).toEqual(['e1', 'e2', 'e3']);
      }
    });
  });

  describe('run', () => {
    it('should run simulation for specified duration', () => {
      engine.run(1.0, 0.1);

      expect(engine.time).toBeCloseTo(1.0);
    });

    it('should call tick multiple times', () => {
      const tickSpy = spyOn(engine, 'tick');

      engine.run(0.3, 0.1);

      expect(tickSpy).toHaveBeenCalledTimes(3);
    });

    it('should set isRunning during execution', () => {
      let wasRunning = false;

      class TestBehavior extends Behavior {
        override onUpdate(): void {
          if (this.owner?.engine?.isRunning) {
            wasRunning = true;
          }
        }
      }

      const entity = new Entity('test');
      entity.addBehavior(new TestBehavior());
      engine.addEntity(entity);

      expect(engine.isRunning).toBe(false);
      engine.run(0.1, 0.1);
      expect(engine.isRunning).toBe(false); // False after completion

      expect(wasRunning).toBe(true); // Was true during execution
    });

    it('should emit simulationStarted event', () => {
      const handler = mock();

      engine.eventBus.on('simulationStarted', handler);
      engine.run(1.0, 0.1);

      expect(handler).toHaveBeenCalledWith({ duration: 1.0, dt: 0.1 });
    });

    it('should emit simulationEnded event', () => {
      const handler = mock();

      engine.eventBus.on('simulationEnded', handler);
      engine.run(0.3, 0.1);

      expect(handler).toHaveBeenCalledWith({ finalTime: expect.closeTo(0.3) });
    });

    it('should update entities correctly during run', () => {
      class CounterBehavior extends Behavior {
        count = 0;

        override onUpdate(): void {
          this.count++;
        }
      }

      const behavior = new CounterBehavior();
      const entity = new Entity('test');
      entity.addBehavior(behavior);
      engine.addEntity(entity);

      engine.run(0.5, 0.1);

      expect(behavior.count).toBe(5);
    });
  });

  describe('reset', () => {
    it('should reset time to 0', () => {
      engine.tick(1.0);
      expect(engine.time).toBe(1.0);

      engine.reset();

      expect(engine.time).toBe(0);
    });

    it('should remove all entities', () => {
      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');

      engine.addEntity(entity1);
      engine.addEntity(entity2);
      expect(engine.entityCount).toBe(2);

      engine.reset();

      expect(engine.entityCount).toBe(0);
      expect(engine.getEntities()).toHaveLength(0);
    });

    it('should call onRemovedFromEngine on all entities', () => {
      const entity1 = new Entity('entity-1');
      const entity2 = new Entity('entity-2');

      const spy1 = spyOn(entity1, 'onRemovedFromEngine');
      const spy2 = spyOn(entity2, 'onRemovedFromEngine');

      engine.addEntity(entity1);
      engine.addEntity(entity2);

      engine.reset();

      expect(spy1).toHaveBeenCalled();
      expect(spy2).toHaveBeenCalled();
      expect(entity1.engine).toBeNull();
      expect(entity2.engine).toBeNull();
    });

    it('should clear all event listeners', () => {
      const handler = mock();

      engine.eventBus.on('tick', handler);
      engine.reset();

      engine.tick(0.016);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should emit engineReset event', () => {
      const handler = mock();

      // Listen before reset
      engine.eventBus.on('engineReset', handler);
      engine.reset();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should reset isRunning', () => {
      // Can't easily test during run, but should be false after reset
      engine.reset();
      expect(engine.isRunning).toBe(false);
    });

    it('should allow reuse after reset', () => {
      // First run
      engine.run(0.5, 0.1);
      expect(engine.time).toBeCloseTo(0.5);

      // Reset
      engine.reset();
      expect(engine.time).toBe(0);

      // Second run
      const entity = new Entity('test');
      engine.addEntity(entity);
      engine.run(0.3, 0.1);

      expect(engine.time).toBeCloseTo(0.3);
      expect(engine.entityCount).toBe(1);
    });
  });

  describe('determinism', () => {
    it('should produce same results with same inputs', () => {
      class CounterBehavior extends Behavior {
        count = 0;

        override onUpdate(): void {
          this.count++;
        }
      }

      // First run
      const engine1 = new GameEngine();
      const behavior1 = new CounterBehavior();
      const entity1 = new Entity('test');
      entity1.addBehavior(behavior1);
      engine1.addEntity(entity1);
      engine1.run(1.0, 0.1);

      // Second run with same setup
      const engine2 = new GameEngine();
      const behavior2 = new CounterBehavior();
      const entity2 = new Entity('test');
      entity2.addBehavior(behavior2);
      engine2.addEntity(entity2);
      engine2.run(1.0, 0.1);

      // Results should be identical
      expect(behavior1.count).toBe(behavior2.count);
      expect(engine1.time).toBe(engine2.time);
    });

    it('should maintain consistent entity iteration order across ticks', () => {
      const orders: Array<Array<string>> = [];

      class TrackerBehavior extends Behavior {
        constructor(private id: string) {
          super();
        }

        override onUpdate(): void {
          if (!orders[orders.length - 1]) {
            orders.push([]);
          }
          orders[orders.length - 1].push(this.id);
        }
      }

      const entity1 = new Entity('e1');
      const entity2 = new Entity('e2');
      const entity3 = new Entity('e3');

      entity1.addBehavior(new TrackerBehavior('e1'));
      entity2.addBehavior(new TrackerBehavior('e2'));
      entity3.addBehavior(new TrackerBehavior('e3'));

      engine.addEntity(entity1);
      engine.addEntity(entity2);
      engine.addEntity(entity3);

      // Run multiple ticks
      for (let i = 0; i < 5; i++) {
        orders.push([]);
        engine.tick(0.016);
      }

      // All orders should be identical
      const firstOrder = orders[0];
      for (const order of orders) {
        expect(order).toEqual(firstOrder);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty engine tick', () => {
      expect(() => engine.tick(0.016)).not.toThrow();
      expect(engine.time).toBeCloseTo(0.016);
    });

    it('should handle empty engine run', () => {
      expect(() => engine.run(1.0, 0.1)).not.toThrow();
      expect(engine.time).toBeCloseTo(1.0);
    });

    it('should handle entity adding another entity during tick', () => {
      const entity2 = new Entity('entity-2');

      class EntitySpawnerBehavior extends Behavior {
        spawned = false;

        override onUpdate(): void {
          if (!this.spawned && this.owner?.engine) {
            this.owner.engine.addEntity(entity2);
            this.spawned = true;
          }
        }
      }

      const entity1 = new Entity('entity-1');
      entity1.addBehavior(new EntitySpawnerBehavior());

      engine.addEntity(entity1);
      expect(engine.entityCount).toBe(1);

      engine.tick(0.016);
      expect(engine.entityCount).toBe(2);
    });

    it('should handle entity removing itself during tick', () => {
      class SelfRemovingBehavior extends Behavior {
        tickCount = 0;

        override onUpdate(): void {
          this.tickCount++;
          if (this.tickCount >= 3 && this.owner?.engine) {
            this.owner.engine.removeEntity(this.owner);
          }
        }
      }

      const entity = new Entity('test');
      entity.addBehavior(new SelfRemovingBehavior());

      engine.addEntity(entity);
      expect(engine.entityCount).toBe(1);

      engine.tick(0.016);
      engine.tick(0.016);
      expect(engine.entityCount).toBe(1);

      engine.tick(0.016);
      expect(engine.entityCount).toBe(0);
    });

    it('should handle zero dt', () => {
      expect(() => engine.tick(0)).not.toThrow();
      expect(engine.time).toBe(0);
    });

    it('should handle negative dt', () => {
      // Engine doesn't prevent this, but time would go backward
      engine.tick(-0.016);
      expect(engine.time).toBeCloseTo(-0.016);
    });

    it('should handle very large dt', () => {
      engine.tick(1000000);
      expect(engine.time).toBe(1000000);
    });

    it('should handle very small dt', () => {
      engine.tick(0.0000001);
      expect(engine.time).toBeCloseTo(0.0000001);
    });
  });

  describe('entityCount', () => {
    it('should return 0 for empty engine', () => {
      expect(engine.entityCount).toBe(0);
    });

    it('should return correct count', () => {
      engine.addEntity(new Entity('e1'));
      expect(engine.entityCount).toBe(1);

      engine.addEntity(new Entity('e2'));
      expect(engine.entityCount).toBe(2);

      engine.addEntity(new Entity('e3'));
      expect(engine.entityCount).toBe(3);
    });

    it('should decrease when entities removed', () => {
      const entity = new Entity('test');
      engine.addEntity(entity);
      expect(engine.entityCount).toBe(1);

      engine.removeEntity(entity);
      expect(engine.entityCount).toBe(0);
    });
  });
});
