import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  syncRuntimeMasterDbData: vi.fn(),
  runComparison: vi.fn(),
}));

vi.mock('../polyfills', () => ({}));
vi.mock('@/modules/data/runtime-data-sync', () => ({
  syncRuntimeMasterDbData: mocks.syncRuntimeMasterDbData,
}));
vi.mock('@/modules/simulation/simulators/vacuum-compare', () => ({
  runComparison: mocks.runComparison,
}));

type WorkerMessageEvent = { data: { type: 'init-data'; payload: unknown } | { type: 'compare'; data: unknown } };

async function setupWorkerHarness() {
  vi.resetModules();

  const listeners: Record<string, Array<(event: WorkerMessageEvent) => void>> = {};
  const addEventListener = vi.fn((eventName: string, handler: (event: WorkerMessageEvent) => void) => {
    if (!listeners[eventName]) {
      listeners[eventName] = [];
    }
    listeners[eventName].push(handler);
  });

  const postMessage = vi.fn();
  Object.assign(globalThis, {
    self: { addEventListener },
    postMessage,
  });

  await import('./simulator.worker');
  const messageHandler = listeners.message?.[0];
  if (!messageHandler) {
    throw new Error('simulator.worker did not register a message handler');
  }

  return {
    messageHandler,
    postMessage,
  };
}

describe('simulator.worker hydration protocol', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runComparison.mockReturnValue({ winner: 'uma1' });
  });

  it('rejects compare requests before runtime data init', async () => {
    const { messageHandler, postMessage } = await setupWorkerHarness();

    messageHandler({
      data: {
        type: 'compare',
        data: { nsamples: 1, options: {} },
      },
    });

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'worker-error',
        error: expect.any(String),
      }),
    );
    expect(mocks.runComparison).not.toHaveBeenCalled();
  });

  it('hydrates with sync payload, emits ready, and then processes compare', async () => {
    const { messageHandler, postMessage } = await setupWorkerHarness();
    const payload = {
      resourceVersion: 'rv-20260309',
      appVersion: '1.20.14',
      skills: {},
      umas: {},
    };

    messageHandler({
      data: {
        type: 'init-data',
        payload,
      },
    });

    expect(mocks.syncRuntimeMasterDbData).toHaveBeenCalledWith(payload);
    expect(postMessage).toHaveBeenNthCalledWith(1, {
      type: 'data-ready',
      resourceVersion: 'rv-20260309',
    });

    messageHandler({
      data: {
        type: 'compare',
        data: {
          nsamples: 1,
          course: {},
          racedef: {},
          uma1: { skills: [] },
          uma2: { skills: [] },
          options: {},
          forcedPositions: undefined,
          injectedDebuffs: [],
        },
      },
    });

    expect(mocks.runComparison).toHaveBeenCalled();
    expect(mocks.runComparison).toHaveBeenLastCalledWith(
      expect.objectContaining({
        nsamples: 1,
        options: expect.objectContaining({ mode: 'compare' }),
      }),
    );
    expect(postMessage).toHaveBeenCalledWith({
      type: 'compare-progress',
      currentSamples: 1,
      totalSamples: 1,
    });
    expect(postMessage).toHaveBeenCalledWith({
      type: 'compare',
      results: { winner: 'uma1' },
    });
    expect(postMessage).toHaveBeenCalledWith({ type: 'compare-complete' });
  });
});
