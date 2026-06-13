/**
 * WASM-backed Web Worker for the vacuum compare simulation. Mirrors
 * `simulator.worker.ts` but routes through the Rust/WASM `runCompare` engine.
 */

import '../polyfills';

import { cloneDeep } from 'es-toolkit';
import type { CompareParams } from '@/modules/simulation/types';
import type { CompareResult } from '@/modules/simulation/compare.types';
import { initUmaSimWasm } from '@/lib/uma-sim-wasm/loader';
import {
  reduceCompareRoundsPublic,
  runComparisonRoundsWasm,
  type CompareRounds
} from '@/modules/simulation/simulators/wasm-compare';

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

  const baseParams: CompareParams = {
    nsamples,
    course,
    racedef,
    uma1: uma1_,
    uma2: uma2_,
    options: compareOptions,
    forcedPositions,
    injectedDebuffs,
    scenarioOverrides
  };

  // Simulate incrementally: each progressive checkpoint adds only the *new*
  // rounds (seed-offset by the count already run), so every round is simulated
  // exactly once across the whole progression instead of re-running the full
  // batch from scratch at every step. Progress is reported per chunk; the heavy
  // reduced result is sent ONCE at the end (avoids re-posting the large payload).
  const roundsA: CompareRounds['roundsA'] = [];
  const roundsB: CompareRounds['roundsB'] = [];
  let done = 0;

  for (const n of progressiveSampleSizes(nsamples)) {
    const delta = n - done;
    if (delta > 0) {
      const chunk = await runComparisonRoundsWasm(baseParams, delta, done);
      roundsA.push(...chunk.roundsA);
      roundsB.push(...chunk.roundsB);
      done = n;
    }

    sendMessage({
      type: 'compare-progress',
      currentSamples: done,
      totalSamples: nsamples
    });
  }

  const results: CompareResult = reduceCompareRoundsPublic({ roundsA, roundsB }, nsamples);
  sendMessage({ type: 'compare', results });
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
