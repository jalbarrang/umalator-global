import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncWorkerRuntimeData } from './worker-sync';
import type { WorkerSyncPayload } from '@/workers/runtime-data-protocol';

class MockWorker {
  private readonly listeners = new Set<(event: MessageEvent<unknown>) => void>();

  addEventListener = vi.fn((eventName: string, listener: (event: MessageEvent<unknown>) => void) => {
    if (eventName === 'message') {
      this.listeners.add(listener);
    }
  });

  removeEventListener = vi.fn(
    (eventName: string, listener: (event: MessageEvent<unknown>) => void) => {
      if (eventName === 'message') {
        this.listeners.delete(listener);
      }
    },
  );

  postMessage = vi.fn();

  emit(data: unknown): void {
    const event = { data } as MessageEvent<unknown>;
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

const payload: WorkerSyncPayload = {
  resourceVersion: '20260309',
  appVersion: '1.20.14',
  skills: {},
  umas: {},
};

describe('syncWorkerRuntimeData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('resolves when matching data-ready arrives and cleans listener', async () => {
    const worker = new MockWorker();
    const syncPromise = syncWorkerRuntimeData(worker as unknown as Worker, payload, { timeoutMs: 5000 });

    worker.emit({
      type: 'data-ready',
      resourceVersion: payload.resourceVersion,
    });

    await expect(syncPromise).resolves.toBeUndefined();
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: 'init-data',
      payload,
    });
    expect(worker.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('rejects when worker reports a sync error', async () => {
    const worker = new MockWorker();
    const syncPromise = syncWorkerRuntimeData(worker as unknown as Worker, payload, { timeoutMs: 5000 });

    worker.emit({
      type: 'worker-error',
      error: 'sync failed',
    });

    await expect(syncPromise).rejects.toThrow(/sync failed/i);
    expect(worker.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('rejects on timeout and removes listener', async () => {
    const worker = new MockWorker();
    const syncPromise = syncWorkerRuntimeData(worker as unknown as Worker, payload, { timeoutMs: 1500 });
    const rejection = expect(syncPromise).rejects.toThrow(
      /timed out after 1500ms waiting for worker data sync/i,
    );

    await vi.advanceTimersByTimeAsync(1500);

    await rejection;
    expect(worker.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
