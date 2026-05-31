/**
 * WASM-backed Web Worker for the vacuum compare simulation. Mirrors
 * `simulator.worker.ts` but routes through the Rust/WASM `runCompare` engine.
 */

import '../polyfills';

import { cloneDeep } from 'es-toolkit';
import type { CompareParams } from '@/modules/simulation/types';
import type { CompareResult } from '@/modules/simulation/compare.types';
import { initUmaSimWasm } from '@/lib/uma-sim-wasm/loader';
import { runComparisonWasm } from '@/modules/simulation/simulators/wasm-compare';

type CompareWorkerInMessage = { type: 'compare'; data: CompareParams };
type CompareWorkerOutMessage =
  | { type: 'compare-progress'; currentSamples: number; totalSamples: number }
  | { type: 'compare'; results: CompareResult }
  | { type: 'compare-complete' }
  | { type: 'worker-error'; error: string };

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

async function runRunnersComparison(params: CompareParams): Promise<void> {
  const {
    nsamples,
    course,
    racedef,
    uma1,
    uma2,
    options,
    forcedPositions,
    injectedDebuffs,
    scenarioOverrides
  } = params;

  const uma1_ = cloneDeep(uma1);
  const uma2_ = cloneDeep(uma2);
  const compareOptions = { ...options, mode: 'compare' };

  await initUmaSimWasm();

  let results: CompareResult | null = null;

  for (const n of progressiveSampleSizes(nsamples)) {
    results = await runComparisonWasm({
      nsamples: n,
      course,
      racedef,
      uma1: uma1_,
      uma2: uma2_,
      options: compareOptions,
      forcedPositions,
      injectedDebuffs,
      scenarioOverrides
    });

    sendMessage({
      type: 'compare-progress',
      currentSamples: n,
      totalSamples: nsamples
    });
  }

  if (results) {
    sendMessage({ type: 'compare', results });
  }
  sendMessage({ type: 'compare-complete' });
}

self.addEventListener('message', (event: MessageEvent<CompareWorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'compare':
      runRunnersComparison(message.data).catch((error) => {
        sendMessage({
          type: 'worker-error',
          error: error instanceof Error ? error.message : 'Unknown WASM compare error'
        });
      });
      break;
  }
});
