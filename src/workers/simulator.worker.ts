/**
 * Web Worker for running simulations
 */

import { cloneDeep } from 'es-toolkit';
import type { CompareParams } from '@/modules/simulation/types';
import { runComparison } from '@/modules/simulation/simulators/vacuum-compare';

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
  const { nsamples, course, racedef, uma1, uma2, options, forcedPositions } = params;

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
    });

    postMessage({
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
  });

  // Always post final results
  postMessage({ type: 'compare', results });
  postMessage({ type: 'compare-complete' });
};

self.addEventListener('message', (e: MessageEvent) => {
  const { msg, data } = e.data;

  switch (msg) {
    case 'compare':
      runRunnersComparison(data);
      break;
  }
});
