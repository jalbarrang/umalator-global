import type { Race } from './race';
import type { RaceLifecycleObserver } from './race';
import type { Runner } from './runner';

export type RaceEventMap = {
  'round-start': [race: Race, seed: number];
  'before-tick': [race: Race, dt: number];
  'after-runner-tick': [race: Race, runner: Runner, dt: number];
  'runner-finished': [race: Race, runner: Runner];
  'round-end': [race: Race];
};

type RaceEventHandler<K extends keyof RaceEventMap> = (...args: RaceEventMap[K]) => void;
type AnyRaceEventHandler = (...args: Array<unknown>) => void;

export class RaceEventBus {
  private listeners = new Map<keyof RaceEventMap, Set<AnyRaceEventHandler>>();

  public on<K extends keyof RaceEventMap>(event: K, fn: RaceEventHandler<K>): () => void {
    const existing = this.listeners.get(event) ?? new Set<AnyRaceEventHandler>();
    existing.add(fn as AnyRaceEventHandler);
    this.listeners.set(event, existing);

    return () => {
      const current = this.listeners.get(event);
      if (!current) {
        return;
      }
      current.delete(fn as AnyRaceEventHandler);
      if (current.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  public emit<K extends keyof RaceEventMap>(event: K, ...args: RaceEventMap[K]): void {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const listener of Array.from(listeners)) {
      (listener as RaceEventHandler<K>)(...args);
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export function subscribeObserver(
  bus: RaceEventBus,
  observer: RaceLifecycleObserver,
): () => void {
  const unsubRoundStart = bus.on('round-start', (race, seed) => observer.onRoundStart(race, seed));
  const unsubBeforeTick = bus.on('before-tick', (race, dt) => observer.onBeforeTick(race, dt));
  const unsubAfterRunnerTick = bus.on('after-runner-tick', (race, runner, dt) =>
    observer.onAfterRunnerTick(race, runner, dt),
  );
  const unsubRunnerFinished = bus.on('runner-finished', (race, runner) =>
    observer.onRunnerFinished(race, runner),
  );
  const unsubRoundEnd = bus.on('round-end', (race) => observer.onRoundEnd(race));

  return () => {
    unsubRoundStart();
    unsubBeforeTick();
    unsubAfterRunnerTick();
    unsubRunnerFinished();
    unsubRoundEnd();
  };
}
