/**
 * Web Worker for running simulations
 */

import '../polyfills';
import { cloneDeep } from 'es-toolkit';
import type { CompareParams } from '@/modules/simulation/types';
import { runComparison } from '@/modules/simulation/simulators/vacuum-compare';

type CompareWorkerInMessage = { type: 'compare'; data: CompareParams };
type CompareWorkerOutMessage =
  | { type: 'compare-progress'; currentSamples: number; totalSamples: number }
  | { type: 'compare'; results: ReturnType<typeof runComparison> }
  | { type: 'compare-complete' };

function sendMessage(message: CompareWorkerOutMessage): void {
  postMessage(message);
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

  switch (message.type) {
    case 'compare':
      runRunnersComparison(message.data);
      break;
  }
});
