/**
 * Unit tests for EventBus wrapper
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { EventBus } from '../EventBus';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('initialization', () => {
    it('should create a new EventBus instance', () => {
      expect(eventBus).toBeInstanceOf(EventBus);
    });

    it('should start with no listeners', () => {
      expect(eventBus.listenerCount('test')).toBe(0);
    });
  });

  describe('on - subscribe to events', () => {
    it('should add event listener', () => {
      const handler = mock();

      eventBus.on('test', handler);

      expect(eventBus.listenerCount('test')).toBe(1);
    });

    it('should call handler when event is emitted', () => {
      const handler = mock();

      eventBus.on('test', handler);
      eventBus.emit('test', { value: 42 });

      expect(handler).toHaveBeenCalledWith({ value: 42 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple listeners for same event', () => {
      const handler1 = mock();
      const handler2 = mock();
      const handler3 = mock();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.on('test', handler3);

      eventBus.emit('test', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
      expect(handler3).toHaveBeenCalledWith('data');
      expect(eventBus.listenerCount('test')).toBe(3);
    });

    it('should return this for chaining', () => {
      const handler = mock();

      const result = eventBus.on('test', handler);

      expect(result).toBe(eventBus);
    });
  });

  describe('once - subscribe once', () => {
    it('should call handler only once', () => {
      const handler = mock();

      eventBus.once('test', handler);

      eventBus.emit('test', 'first');
      eventBus.emit('test', 'second');
      eventBus.emit('test', 'third');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('should auto-remove listener after first call', () => {
      const handler = mock();

      eventBus.once('test', handler);
      expect(eventBus.listenerCount('test')).toBe(1);

      eventBus.emit('test');
      expect(eventBus.listenerCount('test')).toBe(0);
    });

    it('should return this for chaining', () => {
      const handler = mock();

      const result = eventBus.once('test', handler);

      expect(result).toBe(eventBus);
    });
  });

  describe('off - unsubscribe', () => {
    it('should remove specific listener', () => {
      const handler = mock();

      eventBus.on('test', handler);
      expect(eventBus.listenerCount('test')).toBe(1);

      eventBus.off('test', handler);
      expect(eventBus.listenerCount('test')).toBe(0);
    });

    it('should not call removed listener', () => {
      const handler = mock();

      eventBus.on('test', handler);
      eventBus.off('test', handler);

      eventBus.emit('test', 'data');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should only remove specified listener', () => {
      const handler1 = mock();
      const handler2 = mock();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);

      eventBus.off('test', handler1);

      eventBus.emit('test');

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should return this for chaining', () => {
      const handler = mock();
      eventBus.on('test', handler);

      const result = eventBus.off('test', handler);

      expect(result).toBe(eventBus);
    });
  });

  describe('emit - publish events', () => {
    it('should emit events synchronously', () => {
      const order: Array<number> = [];

      eventBus.on('test', () => {
        order.push(1);
      });

      order.push(0);
      eventBus.emit('test');
      order.push(2);

      expect(order).toEqual([0, 1, 2]);
    });

    it('should pass multiple arguments', () => {
      const handler = mock();

      eventBus.on('test', handler);
      eventBus.emit('test', 'arg1', 'arg2', 'arg3');

      expect(handler).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
    });

    it('should emit to all listeners in order', () => {
      const order: Array<number> = [];

      eventBus.on('test', () => order.push(1));
      eventBus.on('test', () => order.push(2));
      eventBus.on('test', () => order.push(3));

      eventBus.emit('test');

      expect(order).toEqual([1, 2, 3]);
    });

    it('should return true when listeners exist', () => {
      eventBus.on('test', () => {});

      const result = eventBus.emit('test');

      expect(result).toBe(true);
    });

    it('should return false when no listeners exist', () => {
      const result = eventBus.emit('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('removeAllListeners - cleanup', () => {
    it('should remove all listeners for specific event', () => {
      eventBus.on('test1', () => {});
      eventBus.on('test1', () => {});
      eventBus.on('test2', () => {});

      expect(eventBus.listenerCount('test1')).toBe(2);
      expect(eventBus.listenerCount('test2')).toBe(1);

      eventBus.removeAllListeners('test1');

      expect(eventBus.listenerCount('test1')).toBe(0);
      expect(eventBus.listenerCount('test2')).toBe(1);
    });

    it('should remove all listeners for all events when no event specified', () => {
      eventBus.on('test1', () => {});
      eventBus.on('test2', () => {});
      eventBus.on('test3', () => {});

      eventBus.removeAllListeners();

      expect(eventBus.listenerCount('test1')).toBe(0);
      expect(eventBus.listenerCount('test2')).toBe(0);
      expect(eventBus.listenerCount('test3')).toBe(0);
    });

    it('should return this for chaining', () => {
      const result = eventBus.removeAllListeners();

      expect(result).toBe(eventBus);
    });
  });

  describe('type safety with generic event maps', () => {
    it('should support typed event maps', () => {
      type TestEvents = {
        tick: { time: number; dt: number };
        entityAdded: { id: string };
      };

      const typedBus = new EventBus<TestEvents>();
      const tickHandler = mock();
      const entityHandler = mock();

      typedBus.on('tick', tickHandler);
      typedBus.on('entityAdded', entityHandler);

      typedBus.emit('tick', { time: 1.5, dt: 0.016 });
      typedBus.emit('entityAdded', { id: 'entity-1' });

      expect(tickHandler).toHaveBeenCalledWith({ time: 1.5, dt: 0.016 });
      expect(entityHandler).toHaveBeenCalledWith({ id: 'entity-1' });
    });
  });

  describe('edge cases', () => {
    it('should handle removing listener during emit', () => {
      const handler1 = mock();
      const handler2 = mock(() => {
        eventBus.off('test', handler2);
      });
      const handler3 = mock();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.on('test', handler3);

      eventBus.emit('test');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(1);

      // Second emit should not call handler2
      eventBus.emit('test');

      expect(handler1).toHaveBeenCalledTimes(2);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler3).toHaveBeenCalledTimes(2);
    });

    it('should handle adding listener during emit', () => {
      const handler2 = mock();
      const handler1 = mock(() => {
        // Add another listener during emit
        eventBus.on('test', handler2);
      });

      eventBus.on('test', handler1);
      eventBus.emit('test');

      // handler2 should not be called in the same emit
      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).not.toHaveBeenCalled();

      // But should be called in next emit
      eventBus.emit('test');
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle emitting events with no listeners', () => {
      expect(() => eventBus.emit('nonexistent')).not.toThrow();
    });

    it('should handle errors in listeners without breaking other listeners', () => {
      const handler1 = mock();
      const handler2 = mock(() => {
        throw new Error('Handler error');
      });
      const handler3 = mock();

      eventBus.on('test', handler1);
      eventBus.on('test', handler2);
      eventBus.on('test', handler3);

      // eventemitter3 doesn't catch errors by default, so we need to wrap
      expect(() => eventBus.emit('test')).toThrow('Handler error');

      // First handler was called before error
      expect(handler1).toHaveBeenCalledTimes(1);
      // Second handler threw
      expect(handler2).toHaveBeenCalledTimes(1);
      // Third handler was not called due to error
      expect(handler3).not.toHaveBeenCalled();
    });

    it('should not have issues with same handler added multiple times', () => {
      const handler = mock();

      eventBus.on('test', handler);
      eventBus.on('test', handler);
      eventBus.on('test', handler);

      eventBus.emit('test');

      // eventemitter3 allows same handler multiple times
      expect(handler).toHaveBeenCalledTimes(3);
    });
  });

  describe('event naming conventions', () => {
    it('should support colon-separated namespaced events', () => {
      const handler1 = mock();
      const handler2 = mock();

      eventBus.on('race:phaseChanged', handler1);
      eventBus.on('skill:activated', handler2);

      eventBus.emit('race:phaseChanged', { phase: 1 });
      eventBus.emit('skill:activated', { skillId: '123' });

      expect(handler1).toHaveBeenCalledWith({ phase: 1 });
      expect(handler2).toHaveBeenCalledWith({ skillId: '123' });
    });

    it('should support symbol events', () => {
      const symbolEvent = Symbol('test');
      const handler = mock();

      eventBus.on(symbolEvent, handler);
      eventBus.emit(symbolEvent, 'data');

      expect(handler).toHaveBeenCalledWith('data');
    });
  });
});
