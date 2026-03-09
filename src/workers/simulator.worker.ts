/**
 * Web Worker for running simulations
 */

import '../polyfills';
import { cloneDeep } from 'es-toolkit';
import type { CompareParams } from '@/modules/simulation/types';
import { syncRuntimeMasterDbData } from '@/modules/data/runtime-data-sync';
import { runComparison } from '@/modules/simulation/simulators/vacuum-compare';
import type {
  WorkerSyncErrorMessage,
  WorkerSyncInMessage,
  WorkerSyncReadyMessage,
} from './runtime-data-protocol';

type CompareWorkerInMessage = WorkerSyncInMessage | { type: 'compare'; data: CompareParams };
type CompareWorkerOutMessage =
  | WorkerSyncReadyMessage
  | WorkerSyncErrorMessage
  | { type: 'compare-progress'; currentSamples: number; totalSamples: number }
  | { type: 'compare'; results: ReturnType<typeof runComparison> }
  | { type: 'compare-complete' };

let activeResourceVersion: string | null = null;

function sendMessage(message: CompareWorkerOutMessage): void {
  postMessage(message);
}

function sendWorkerError(error: unknown): void {
  sendMessage({
    type: 'worker-error',
    error: error instanceof Error ? error.message : 'Unknown worker error',
  });
}

function* progressiveSampleSizes(targetSamples: number) {
  let n = Math.min(20, targetSamples);
  let mul = 6;

  while (n < targetSamples) {
    yield n;
    n = Math.min(n * mul, targetSamples);
    mul = Math.max(mul - 1, 2);
  }

  yield targetSamples;
}

const runRunnersComparison = (params: CompareParams) => {
  const { nsamples, course, racedef, uma1, uma2, options, forcedPositions, injectedDebuffs } =
    params;

  const uma1_ = cloneDeep(uma1);
  const uma2_ = cloneDeep(uma2);

  const compareOptions = { ...options, mode: 'compare' };

  for (const n of progressiveSampleSizes(nsamples)) {
    runComparison({
      nsamples: n,
      course,
      racedef,
      uma1: uma1_,
      uma2: uma2_,
      options: compareOptions,
      forcedPositions,
      injectedDebuffs,
    });

    sendMessage({
      type: 'compare-progress',
      currentSamples: n,
      totalSamples: nsamples,
    });
  }

  const results = runComparison({
    nsamples,
    course,
    racedef,
    uma1: uma1_,
    uma2: uma2_,
    options: compareOptions,
    forcedPositions,
    injectedDebuffs,
  });

  // Always post final results
  sendMessage({ type: 'compare', results });
  sendMessage({ type: 'compare-complete' });
};

self.addEventListener('message', (event: MessageEvent<CompareWorkerInMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'init-data':
        activeResourceVersion = null;
        syncRuntimeMasterDbData(message.payload);
        activeResourceVersion = message.payload.resourceVersion;
        sendMessage({
          type: 'data-ready',
          resourceVersion: activeResourceVersion,
        });
        break;
      case 'compare':
        if (!activeResourceVersion) {
          sendWorkerError('Worker runtime data has not been initialized');
          return;
        }
        runRunnersComparison(message.data);
        break;
    }
  } catch (error) {
    sendWorkerError(error);
  }
});
