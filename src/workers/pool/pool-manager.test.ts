import { describe, expect, it } from 'vitest';
import { PoolManager } from './pool-manager';
import type { SimulationParams, WorkerInMessage, WorkerOutMessage } from './types';
import type { SkillComparisonResponse, SkillComparisonRoundResult } from '@/modules/simulation/types';
import type { SkillSimulationRun } from '@/modules/simulation/compare.types';

const emptySkillRun: SkillSimulationRun = {
  sk: [{}, {}],
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
      medianrun: emptySkillRun,
    },
    min: 0,
    max: 1,
    mean: 0.5,
    median: 0.5,
    filterReason: undefined,
  };
}

class FakePoolWorker {
  private messageListeners: Array<(event: MessageEvent<WorkerOutMessage>) => void> = [];

  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<WorkerOutMessage>) => void) | ((event: ErrorEvent) => void),
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
          workerId: message.workerId,
        });
        break;
      case 'work-batch': {
        const results: SkillComparisonResponse = Object.fromEntries(
          message.batch.skills.map((skillId) => [skillId, createRoundResult(skillId, message.batch.nsamples)]),
        );

        this.emitMessage({
          type: 'batch-complete',
          workerId: 0,
          batchId: message.batch.batchId,
          results,
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
  it('reports batch deltas on progress while keeping cumulative final results', () => {
    const progressLengths: Array<number> = [];
    let finalLength = 0;

    const manager = new PoolManager(
      () => new FakePoolWorker() as unknown as Worker,
      2,
    );

    manager.run(
      ['speed-boost'],
      {} as SimulationParams,
      {
        onProgress: (results) => {
          progressLengths.push(results['speed-boost']?.results.length ?? 0);
        },
        onComplete: (results) => {
          finalLength = results['speed-boost']?.results.length ?? 0;
        },
      },
    );

    expect(progressLengths).toEqual([5, 20, 50]);
    expect(finalLength).toBe(75);
  });
});
