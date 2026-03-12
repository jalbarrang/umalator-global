import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  syncRuntimeMasterDbData: vi.fn(),
  runSampling: vi.fn(),
}));

vi.mock('@/modules/data/runtime-data-sync', () => ({
  syncRuntimeMasterDbData: mocks.syncRuntimeMasterDbData,
}));
vi.mock('@/modules/simulation/simulators/skill-compare', () => ({
  runSampling: mocks.runSampling,
}));

type WorkerMessageEvent = {
  data:
    | { type: 'init'; workerId: number; params: unknown; syncPayload: unknown }
    | { type: 'work-batch'; batch: unknown }
    | { type: 'terminate' };
};

async function setupWorkerHarness() {
  vi.resetModules();

  const listeners: Record<string, Array<(event: WorkerMessageEvent) => void>> = {};
  const addEventListener = vi.fn((eventName: string, handler: (event: WorkerMessageEvent) => void) => {
    if (!listeners[eventName]) {
      listeners[eventName] = [];
    }
    listeners[eventName].push(handler);
  });

  const close = vi.fn();
  const postMessage = vi.fn();
  Object.assign(globalThis, {
    self: { addEventListener, close },
    postMessage,
  });

  await import('./skill-basin.pool.worker');
  const messageHandler = listeners.message?.[0];
  if (!messageHandler) {
    throw new Error('skill-basin.pool.worker did not register a message handler');
  }

  return {
    messageHandler,
    postMessage,
  };
}

describe('skill basin pool worker init protocol', () => {
  const runSamplingResult = { '100101': { min: 0, max: 1 } };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runSampling.mockReturnValue(runSamplingResult);
  });

  it('rejects work batches before init', async () => {
    const { messageHandler, postMessage } = await setupWorkerHarness();

    messageHandler({
      data: {
        type: 'work-batch',
        batch: {
          batchId: 1,
          stage: 1,
          nsamples: 10,
          skills: ['100101'],
        },
      },
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'worker-error',
      workerId: -1,
      error: 'Worker not initialized',
    });
    expect(mocks.runSampling).not.toHaveBeenCalled();
  });

  it('hydrates from init sync payload before processing work-batch', async () => {
    const { messageHandler, postMessage } = await setupWorkerHarness();
    const params = {
      course: {},
      racedef: {},
      uma: { skills: [] },
      options: { seed: 42 },
    };
    const syncPayload = {
      resourceVersion: '10005000',
      appVersion: '1.20.14',
      skills: {},
      umas: {},
    };

    messageHandler({
      data: {
        type: 'init',
        workerId: 7,
        params,
        syncPayload,
      },
    });

    expect(mocks.syncRuntimeMasterDbData).toHaveBeenCalledWith(syncPayload);
    expect(postMessage).toHaveBeenNthCalledWith(1, {
      type: 'worker-ready',
      workerId: 7,
      resourceVersion: '10005000',
    });

    messageHandler({
      data: {
        type: 'work-batch',
        batch: {
          batchId: 11,
          stage: 2,
          nsamples: 25,
          skills: ['100101', '100201'],
        },
      },
    });

    expect(mocks.runSampling).toHaveBeenCalledWith(
      expect.objectContaining({
        nsamples: 25,
        skills: ['100101', '100201'],
        options: { seed: 42 },
      }),
    );
    expect(postMessage).toHaveBeenLastCalledWith({
      type: 'batch-complete',
      workerId: 7,
      batchId: 11,
      results: runSamplingResult,
    });
  });
});
