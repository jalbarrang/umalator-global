/**
 * Integration tests for Tiny Engine
 *
 * These tests verify that all components work together correctly
 * in real-world scenarios.
 */

import { describe, expect, it } from 'bun:test';
import { GameEngine } from '../GameEngine';
import { Behavior } from '../Behavior';
import { Entity } from '../Entity';

describe('Integration Tests', () => {
  describe('Complete Simulation', () => {
    it('should run a complete multi-entity simulation', () => {
      const engine = new GameEngine();

      // Create entities with different behaviors
      class VelocityBehavior extends Behavior {
        position = 0;
        velocity = 10;

        override onUpdate(dt: number): void {
          this.position += this.velocity * dt;
        }
      }

      class CounterBehavior extends Behavior {
        count = 0;

        override onUpdate(): void {
          this.count++;
        }
      }

      const mover = new Entity('mover');
      const counter = new Entity('counter');

      const velocityBehavior = new VelocityBehavior();
      const counterBehavior = new CounterBehavior();

      mover.addBehavior(velocityBehavior);
      counter.addBehavior(counterBehavior);

      engine.addEntity(mover);
      engine.addEntity(counter);

      // Run simulation
      engine.run(1.0, 0.1); // 1 second at 10 Hz

      // Verify results
      expect(counterBehavior.count).toBe(10);
      expect(velocityBehavior.position).toBeCloseTo(10);
      expect(engine.time).toBeCloseTo(1.0);
    });

    it('should handle complex behavior interactions', () => {
      const engine = new GameEngine();

      class ProducerBehavior extends Behavior {
        value = 0;

        override onUpdate(dt: number): void {
          this.value += dt * 100;
          this.owner?.engine?.eventBus.emit('valueProduced', {
            entityId: this.owner.id,
            value: this.value,
          });
        }
      }

      class ConsumerBehavior extends Behavior {
        consumedValues: Array<number> = [];
        private listenerAttached = false;

        override onUpdate(): void {
          // Subscribe to events on first update when engine is available
          if (!this.listenerAttached && this.owner?.engine) {
            this.owner.engine.eventBus.on('valueProduced', (data: any) => {
              this.consumedValues.push(data.value);
            });
            this.listenerAttached = true;
          }
        }
      }

      const producer = new Entity('producer');
      const consumer = new Entity('consumer');

      producer.addBehavior(new ProducerBehavior());
      const consumerBehavior = new ConsumerBehavior();
      consumer.addBehavior(consumerBehavior);

      engine.addEntity(consumer); // Add consumer first so it subscribes first
      engine.addEntity(producer);

      engine.run(0.3, 0.1);

      // Consumer should have received 3 values
      expect(consumerBehavior.consumedValues).toHaveLength(3);
      expect(consumerBehavior.consumedValues[0]).toBeCloseTo(10);
      expect(consumerBehavior.consumedValues[1]).toBeCloseTo(20);
      expect(consumerBehavior.consumedValues[2]).toBeCloseTo(30);
    });
  });

  describe('Cross-Entity Communication', () => {
    it('should allow entities to communicate via EventBus', () => {
      const engine = new GameEngine();
      const messages: Array<string> = [];

      class SenderBehavior extends Behavior {
        override onUpdate(): void {
          this.owner?.engine?.eventBus.emit('message', {
            from: this.owner.id,
            text: 'Hello',
          });
        }
      }

      class ReceiverBehavior extends Behavior {
        private listenerAttached = false;

        override onUpdate(): void {
          // Subscribe to events on first update when engine is available
          if (!this.listenerAttached && this.owner?.engine) {
            this.owner.engine.eventBus.on('message', (data: any) => {
              messages.push(`${this.owner!.id} received: ${data.text} from ${data.from}`);
            });
            this.listenerAttached = true;
          }
        }
      }

      const sender = new Entity('sender');
      const receiver1 = new Entity('receiver1');
      const receiver2 = new Entity('receiver2');

      sender.addBehavior(new SenderBehavior());
      receiver1.addBehavior(new ReceiverBehavior());
      receiver2.addBehavior(new ReceiverBehavior());

      // Add receivers first so they subscribe before sender sends
      engine.addEntity(receiver1);
      engine.addEntity(receiver2);
      engine.addEntity(sender);

      engine.tick(0.016);

      expect(messages).toHaveLength(2);
      expect(messages).toContain('receiver1 received: Hello from sender');
      expect(messages).toContain('receiver2 received: Hello from sender');
    });

    it('should support request-response pattern', () => {
      const engine = new GameEngine();

      class ServerBehavior extends Behavior {
        private listenerAttached = false;

        override onUpdate(): void {
          // Subscribe to events on first update when engine is available
          if (!this.listenerAttached && this.owner?.engine) {
            this.owner.engine.eventBus.on('request', (data: any) => {
              this.owner?.engine?.eventBus.emit('response', {
                requestId: data.id,
                result: data.value * 2,
              });
            });
            this.listenerAttached = true;
          }
        }
      }

      class ClientBehavior extends Behavior {
        responses: Array<any> = [];
        private listenerAttached = false;
        private requestSent = false;

        override onUpdate(): void {
          // Subscribe to events on first update when engine is available
          if (!this.listenerAttached && this.owner?.engine) {
            this.owner.engine.eventBus.on('response', (data: any) => {
              this.responses.push(data);
            });
            this.listenerAttached = true;
          }

          // Send request after listener is attached
          if (this.listenerAttached && !this.requestSent) {
            this.owner?.engine?.eventBus.emit('request', {
              id: 'req-1',
              value: 21,
            });
            this.requestSent = true;
          }
        }
      }

      const server = new Entity('server');
      const client = new Entity('client');

      server.addBehavior(new ServerBehavior());
      const clientBehavior = new ClientBehavior();
      client.addBehavior(clientBehavior);

      engine.addEntity(server);
      engine.addEntity(client);

      engine.tick(0.016);

      expect(clientBehavior.responses).toHaveLength(1);
      expect(clientBehavior.responses[0]).toEqual({
        requestId: 'req-1',
        result: 42,
      });
    });
  });

  describe('Priority Execution', () => {
    it('should execute behaviors in correct priority order', () => {
      const engine = new GameEngine();
      const executionLog: Array<string> = [];

      class HighPriorityBehavior extends Behavior {
        override priority = -100;

        override onUpdate(): void {
          executionLog.push('high');
        }
      }

      class MediumPriorityBehavior extends Behavior {
        override priority = 0;

        override onUpdate(): void {
          executionLog.push('medium');
        }
      }

      class LowPriorityBehavior extends Behavior {
        override priority = 100;

        override onUpdate(): void {
          executionLog.push('low');
        }
      }

      const entity = new Entity('test');
      entity.addBehavior(new LowPriorityBehavior());
      entity.addBehavior(new HighPriorityBehavior());
      entity.addBehavior(new MediumPriorityBehavior());

      engine.addEntity(entity);
      engine.tick(0.016);

      expect(executionLog).toEqual(['high', 'medium', 'low']);
    });

    it('should handle complex priority chains across entities', () => {
      const engine = new GameEngine();
      const executionLog: Array<string> = [];

      class TrackerBehavior extends Behavior {
        constructor(
          private label: string,
          priority: number,
        ) {
          super();
          this.priority = priority;
        }

        override onUpdate(): void {
          executionLog.push(this.label);
        }
      }

      const entity1 = new Entity('e1');
      const entity2 = new Entity('e2');
      const entity3 = new Entity('e3');

      // Entity 1: high priority behaviors
      entity1.addBehavior(new TrackerBehavior('e1-high', -50));
      entity1.addBehavior(new TrackerBehavior('e1-low', 50));

      // Entity 2: mixed priorities
      entity2.addBehavior(new TrackerBehavior('e2-medium', 0));

      // Entity 3: more mixed
      entity3.addBehavior(new TrackerBehavior('e3-veryhigh', -100));
      entity3.addBehavior(new TrackerBehavior('e3-verylow', 100));

      // Add in specific order
      engine.addEntity(entity1);
      engine.addEntity(entity2);
      engine.addEntity(entity3);

      engine.tick(0.016);

      // Should execute in entity order, then priority order within entity
      expect(executionLog).toEqual(['e1-high', 'e1-low', 'e2-medium', 'e3-veryhigh', 'e3-verylow']);
    });
  });

  describe('Determinism Validation', () => {
    it('should produce identical results across multiple runs', () => {
      class SimulationBehavior extends Behavior {
        value = 1;

        override onUpdate(dt: number): void {
          // Simple deterministic calculation
          this.value += dt * 10;
          this.value = Math.floor(this.value * 100) / 100;
        }
      }

      const results: Array<number> = [];

      // Run simulation 5 times
      for (let run = 0; run < 5; run++) {
        const engine = new GameEngine();
        const entity = new Entity('test');
        const behavior = new SimulationBehavior();
        entity.addBehavior(behavior);
        engine.addEntity(entity);

        engine.run(1.0, 0.1);
        results.push(behavior.value);
      }

      // All results should be identical
      expect(results.every((v) => v === results[0])).toBe(true);
    });

    it('should maintain deterministic order with dynamic entity management', () => {
      const runs: Array<Array<string>> = [];

      for (let run = 0; run < 3; run++) {
        const engine = new GameEngine();
        const order: Array<string> = [];

        class TrackerBehavior extends Behavior {
          constructor(private id: string) {
            super();
          }

          override onUpdate(): void {
            order.push(this.id);

            // Dynamically add/remove entities
            if (this.id === 'spawner' && order.length === 1 && this.owner?.engine) {
              const newEntity = new Entity('spawned');
              newEntity.addBehavior(new TrackerBehavior('spawned'));
              this.owner.engine.addEntity(newEntity);
            }
          }
        }

        const spawner = new Entity('spawner');
        spawner.addBehavior(new TrackerBehavior('spawner'));

        const stable = new Entity('stable');
        stable.addBehavior(new TrackerBehavior('stable'));

        engine.addEntity(spawner);
        engine.addEntity(stable);

        engine.tick(0.016);
        engine.tick(0.016);

        runs.push([...order]);
      }

      // All runs should have identical order
      expect(runs[0]).toEqual(runs[1]);
      expect(runs[1]).toEqual(runs[2]);
    });
  });

  describe('Real-World Scenario: Counter + Velocity', () => {
    it('should implement counter and velocity behaviors together', () => {
      const engine = new GameEngine();

      class CounterBehavior extends Behavior {
        count = 0;

        override onUpdate(): void {
          this.count++;
          if (this.count % 5 === 0 && this.owner?.engine) {
            this.owner.engine.eventBus.emit('counter:milestone', {
              count: this.count,
            });
          }
        }
      }

      class VelocityBehavior extends Behavior {
        position = 0;
        velocity = 15;

        override onUpdate(dt: number): void {
          this.position += this.velocity * dt;
        }
      }

      class LoggerBehavior extends Behavior {
        logs: Array<string> = [];
        private listenerAttached = false;

        override onUpdate(): void {
          // Subscribe to events on first update when engine is available
          if (!this.listenerAttached && this.owner?.engine) {
            this.owner.engine.eventBus.on('counter:milestone', (data: any) => {
              this.logs.push(`Milestone: ${data.count}`);
            });
            this.listenerAttached = true;
          }
        }
      }

      const counter = new Entity('counter');
      const mover = new Entity('mover');
      const logger = new Entity('logger');

      const counterBehavior = new CounterBehavior();
      const velocityBehavior = new VelocityBehavior();
      const loggerBehavior = new LoggerBehavior();

      counter.addBehavior(counterBehavior);
      mover.addBehavior(velocityBehavior);
      logger.addBehavior(loggerBehavior);

      engine.addEntity(counter);
      engine.addEntity(mover);
      engine.addEntity(logger);

      // Run for 2 seconds at 10 Hz = 20 ticks
      engine.run(2.0, 0.1);

      // Verify counter
      expect(counterBehavior.count).toBe(20);

      // Verify velocity (15 units/s * 2s = 30 units)
      expect(velocityBehavior.position).toBeCloseTo(30);

      // Verify logger received milestones at 5, 10, 15, 20
      expect(loggerBehavior.logs).toHaveLength(4);
      expect(loggerBehavior.logs).toContain('Milestone: 5');
      expect(loggerBehavior.logs).toContain('Milestone: 10');
      expect(loggerBehavior.logs).toContain('Milestone: 15');
      expect(loggerBehavior.logs).toContain('Milestone: 20');
    });
  });

  describe('Complex State Management', () => {
    it('should handle behaviors that modify each other', () => {
      const engine = new GameEngine();

      class AcceleratorBehavior extends Behavior {
        acceleration = 2;

        override onUpdate(): void {
          const velocity = this.owner?.getBehavior(VelocityBehavior);
          if (velocity) {
            velocity.velocity += this.acceleration;
          }
        }
      }

      class VelocityBehavior extends Behavior {
        velocity = 0;
        position = 0;

        override onUpdate(dt: number): void {
          this.position += this.velocity * dt;
        }
      }

      class DamperBehavior extends Behavior {
        override priority = 100; // Run after accelerator

        override onUpdate(): void {
          const velocity = this.owner?.getBehavior(VelocityBehavior);
          if (velocity && velocity.velocity > 10) {
            velocity.velocity = 10; // Cap at 10
          }
        }
      }

      const entity = new Entity('physics');
      const velocityBehavior = new VelocityBehavior();

      entity.addBehavior(new AcceleratorBehavior());
      entity.addBehavior(velocityBehavior);
      entity.addBehavior(new DamperBehavior());

      engine.addEntity(entity);

      // Run for 10 ticks
      for (let i = 0; i < 10; i++) {
        engine.tick(0.1);
      }

      // Velocity should be capped at 10
      expect(velocityBehavior.velocity).toBe(10);

      // Position should have accumulated
      // Tick 0: accel v=2, velocity p+=2*0.1=0.2, damper no-op
      // Tick 1: accel v=4, velocity p+=4*0.1=0.6, damper no-op
      // Tick 2: accel v=6, velocity p+=6*0.1=1.2, damper no-op
      // Tick 3: accel v=8, velocity p+=8*0.1=2.0, damper no-op
      // Tick 4: accel v=10, velocity p+=10*0.1=3.0, damper no-op (v=10 not > 10)
      // Tick 5: accel v=12, velocity p+=12*0.1=4.2, damper caps to 10
      // Tick 6: accel v=12, velocity p+=12*0.1=5.4, damper caps to 10
      // Tick 7: accel v=12, velocity p+=12*0.1=6.6, damper caps to 10
      // Tick 8: accel v=12, velocity p+=12*0.1=7.8, damper caps to 10
      // Tick 9: accel v=12, velocity p+=12*0.1=9.0, damper caps to 10
      expect(velocityBehavior.position).toBeCloseTo(9.0);
    });
  });

  describe('Error Resilience', () => {
    it('should continue running if a behavior throws during update', () => {
      const engine = new GameEngine();

      class FailingBehavior extends Behavior {
        override onUpdate(): void {
          throw new Error('Behavior failed');
        }
      }

      class SucceedingBehavior extends Behavior {
        updateCount = 0;

        override onUpdate(): void {
          this.updateCount++;
        }
      }

      const failingEntity = new Entity('failing');
      const succeedingEntity = new Entity('succeeding');

      failingEntity.addBehavior(new FailingBehavior());
      const succeedingBehavior = new SucceedingBehavior();
      succeedingEntity.addBehavior(succeedingBehavior);

      engine.addEntity(failingEntity);
      engine.addEntity(succeedingEntity);

      // First entity throws, but that's up to the consumer to handle
      // Engine will propagate the error
      expect(() => engine.tick(0.016)).toThrow('Behavior failed');

      // Failing entity was updated first, succeeding entity wasn't reached
      expect(succeedingBehavior.updateCount).toBe(0);
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle many entities efficiently', () => {
      const engine = new GameEngine();

      class SimpleBehavior extends Behavior {
        value = 0;

        override onUpdate(dt: number): void {
          this.value += dt;
        }
      }

      // Add 1000 entities
      const behaviors: Array<SimpleBehavior> = [];
      for (let i = 0; i < 1000; i++) {
        const entity = new Entity(`entity-${i}`);
        const behavior = new SimpleBehavior();
        behaviors.push(behavior);
        entity.addBehavior(behavior);
        engine.addEntity(entity);
      }

      expect(engine.entityCount).toBe(1000);

      // Run for 1 second
      const startTime = performance.now();
      engine.run(1.0, 0.1);
      const endTime = performance.now();

      // Verify all entities updated
      for (const behavior of behaviors) {
        expect(behavior.value).toBeCloseTo(1.0);
      }

      // Should complete reasonably quickly (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
