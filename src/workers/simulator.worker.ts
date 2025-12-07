/**
 * Web Worker for running simulations
 */

import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { runComparison } from '@/utils/compare';
import { CompareParams } from '@/modules/simulation/types';

const runRunnersComparison = (params: CompareParams) => {
  const { nsamples, course, racedef, uma1, uma2, pacer, options } = params;

  const uma1_ = {
    ...uma1,
    skills: [...uma1.skills],
    forcedSkillPositions: { ...uma1.forcedSkillPositions },
  };

  const uma2_ = {
    ...uma2,
    skills: [...uma2.skills],
    forcedSkillPositions: { ...uma2.forcedSkillPositions },
  };

  let pacer_: RunnerState | null = null;
  if (pacer) {
    pacer_ = {
      ...pacer,
      skills: [...pacer.skills],
      forcedSkillPositions: { ...pacer.forcedSkillPositions },
    };
  }

  const compareOptions = { ...options, mode: 'compare' };

  for (
    let n = Math.min(20, nsamples), mul = 6;
    n < nsamples;
    n = Math.min(n * mul, nsamples), mul = Math.max(mul - 1, 2)
  ) {
    const results = runComparison({
      nsamples: n,
      course,
      racedef,
      runnerA: uma1_,
      runnerB: uma2_,
      pacer: pacer_,
      options: compareOptions,
    });

    postMessage({ type: 'compare', results });
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
