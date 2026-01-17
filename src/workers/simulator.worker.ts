/**
 * Web Worker for running simulations
 */

import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CompareParams } from '@/modules/simulation/types';
import { runComparison } from '@/utils/compare';

const copyRunner = (runner: RunnerState) => {
  return {
    ...runner,
    skills: [...runner.skills],
    forcedSkillPositions: { ...runner.forcedSkillPositions },
  };
};

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
  const { nsamples, course, racedef, uma1, uma2, pacer, options } = params;

  const uma1_ = copyRunner(uma1);
  const uma2_ = copyRunner(uma2);
  const pacer_ = pacer ? copyRunner(pacer) : null;

  const compareOptions = { ...options, mode: 'compare' };

  for (const n of progressiveSampleSizes(nsamples)) {
    runComparison({
      nsamples: n,
      course,
      racedef,
      runnerA: uma1_,
      runnerB: uma2_,
      pacer: pacer_,
      options: compareOptions,
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
    runnerA: uma1_,
    runnerB: uma2_,
    pacer: pacer_,
    options: compareOptions,
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
