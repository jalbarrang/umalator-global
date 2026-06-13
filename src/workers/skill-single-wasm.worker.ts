/**
 * WASM-backed worker for running additional samples for a single skill
 * (Compare Skills / Compare Uniques). Mirrors `skill-single.worker.ts` but
 * routes through the Rust/WASM `runCompare` engine.
 */

import '../polyfills';
import { clone, cloneDeepWith } from 'es-toolkit';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import type { SimulationParams } from './pool/types';
import { initUmaSimWasm } from '@/lib/uma-sim-wasm/loader';
import { runSamplingWasm } from '@/modules/simulation/simulators/wasm-skill-compare';

export type SingleSkillWasmWorkerInMessage =
  | {
      type: 'run';
      skillId: string;
      nsamples: number;
      seed: number;
      params: SimulationParams;
    }
  | { type: 'terminate' };

export type SingleSkillWasmWorkerOutMessage =
  | { type: 'complete'; skillId: string; results: SkillComparisonResponse }
  | { type: 'error'; skillId: string; error: string };

function sendMessage(message: SingleSkillWasmWorkerOutMessage): void {
  postMessage(message);
}

async function run(message: Extract<SingleSkillWasmWorkerInMessage, { type: 'run' }>) {
  const { skillId, nsamples, seed, params } = message;
  const { course, racedef, uma, options } = params;

  const baseRunner = cloneDeepWith(uma, (value, key) => {
    if (key === 'skills') return clone(value);
  });

  await initUmaSimWasm();

  const results: SkillComparisonResponse = await runSamplingWasm({
    nsamples,
    skills: [skillId],
    course,
    racedef,
    uma: baseRunner,
    options: { ...options, seed }
  });

  sendMessage({ type: 'complete', skillId, results });
}

self.addEventListener('message', (event: MessageEvent<SingleSkillWasmWorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'run':
      run(message).catch((error) => {
        sendMessage({
          type: 'error',
          skillId: message.skillId,
          error: error instanceof Error ? error.message : 'Unknown WASM skill error'
        });
      });
      break;

    case 'terminate':
      self.close();
      break;
  }
});
