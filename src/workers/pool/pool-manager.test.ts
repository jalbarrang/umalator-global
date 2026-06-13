import { describe, expect, it } from 'vitest';
import { PoolManager, type SkillSamplingPlanBuilder } from './pool-manager';
import type { SimulationParams, WorkerInMessage, WorkerOutMessage } from './types';
import type { WasmCompareParams } from '@/lib/uma-sim-wasm/types';
import type {
  SkillComparisonResponse,
  SkillComparisonRoundResult
} from '@/modules/simulation/types';
import type { SkillSimulationRun } from '@/modules/simulation/compare.types';

const emptySkillRun: SkillSimulationRun = {
  sk: [{}, {}]
};

function createRoundResult(skillId: string, nsamples: number): SkillComparisonRoundResult {
  const results = Array.from({ length: nsamples }, (_, index) => index % 2);

  return {
    id: skillId,
    results,
    skillActivations: {},
    runData: {
      minrun: emptySkillRun,
      maxrun: emptySkillRun,
      meanrun: emptySkillRun,
      medianrun: emptySkillRun
    },
    min: 0,
    max: 1,
    mean: 0.5,
    median: 0.5,
    filterReason: undefined
  };
}

class FakePoolWorker {
  private messageListeners: Array<(event: MessageEvent<WorkerOutMessage>) => void> = [];

  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<WorkerOutMessage>) => void) | ((event: ErrorEvent) => void)
  ): void {
    if (type === 'message') {
      this.messageListeners.push(listener as (event: MessageEvent<WorkerOutMessage>) => void);
    }
  }

  removeEventListener(): void {}

  terminate(): void {}

  postMessage(message: WorkerInMessage): void {
    switch (message.type) {
      case 'init':
        this.emitMessage({
          type: 'worker-ready',
          workerId: message.workerId
        });
        break;
      case 'work-batch': {
        const results: SkillComparisonResponse = Object.fromEntries(
          message.plan.entries.map((entry) => [
            entry.skillId,
            createRoundResult(entry.skillId, entry.nsamples)
          ])
        );

        this.emitMessage({
          type: 'batch-complete',
          workerId: 0,
          batchId: message.batchId,
          results
        });
        break;
      }
      case 'terminate':
        break;
    }
  }

  private emitMessage(message: WorkerOutMessage): void {
    const event = { data: message } as MessageEvent<WorkerOutMessage>;
    for (const listener of this.messageListeners) {
      listener(event);
    }
  }
}

describe('PoolManager', () => {
  it('reports batch deltas on progress while keeping cumulative final results', async () => {
    const progressLengths: Array<number> = [];
    let finalLength = 0;
    let completed = false;

    // Stub the plan builder so the scheduling test needs no real skill data:
    // map each batch skill 1:1 to a plan entry carrying its sample count.
    const stubPlanBuilder: SkillSamplingPlanBuilder = (params) => ({
      entries: params.skills.map((skillId) => ({
        skillId,
        nsamples: params.nsamples,
        fallback: { effectType: 0, effectTarget: 1 } as never,
        wasmParamsBaseline: {} as WasmCompareParams,
        wasmParamsTracked: {} as WasmCompareParams
      }))
    });

    const manager = new PoolManager(
      () => new FakePoolWorker() as unknown as Worker,
      2,
      stubPlanBuilder
    );

    manager.run(['speed-boost'], {} as SimulationParams, {
      onProgress: (results) => {
        progressLengths.push(results['speed-boost']?.results.length ?? 0);
      },
      onComplete: (results) => {
        finalLength = results['speed-boost']?.results.length ?? 0;
        completed = true;
      }
    });

    // Worker init is dispatched after the shared-module compile attempt resolves
    // (it rejects in the test env and falls back to self-compile), so flush
    // microtasks until the run completes.
    for (let i = 0; i < 50 && !completed; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    expect(progressLengths).toEqual([5, 20, 50]);
    expect(finalLength).toBe(75);
  });
});
