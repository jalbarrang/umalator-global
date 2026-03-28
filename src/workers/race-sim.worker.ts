import '../polyfills';
import { runRaceSim, type RaceSimParams, type RaceSimResult } from '@/lib/sunday-tools/race-sim/run-race-sim';

export type RaceSimWorkerParams = RaceSimParams;

export type RaceSimWorkerInMessage = {
  type: 'race-sim-run';
  data: RaceSimWorkerParams;
};

export type RaceSimWorkerOutMessage =
  | {
      type: 'race-sim-complete';
      data: RaceSimResult;
    }
  | {
      type: 'race-sim-error';
      error: string;
    };

function sendMessage(message: RaceSimWorkerOutMessage): void {
  postMessage(message);
}

function serializeMapsForPostMessage<T>(value: T): T {
  if (value instanceof Map) {
    const record: Record<string, unknown> = {};
    for (const [key, mapValue] of value.entries()) {
      record[String(key)] = serializeMapsForPostMessage(mapValue);
    }
    return record as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeMapsForPostMessage(item)) as T;
  }

  if (value !== null && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    const serialized: Record<string, unknown> = {};
    for (const [key, objectFieldValue] of Object.entries(objectValue)) {
      serialized[key] = serializeMapsForPostMessage(objectFieldValue);
    }
    return serialized as T;
  }

  return value;
}

self.addEventListener('message', (event: MessageEvent<RaceSimWorkerInMessage>) => {
  const message = event.data;
  if (message.type !== 'race-sim-run') {
    return;
  }

  try {
    const result = runRaceSim(message.data);
    const serializableResult = serializeMapsForPostMessage(result) as RaceSimResult;
    sendMessage({
      type: 'race-sim-complete',
      data: serializableResult,
    });
  } catch (error) {
    sendMessage({
      type: 'race-sim-error',
      error: error instanceof Error ? error.message : 'Unknown race simulation error',
    });
  }
});
