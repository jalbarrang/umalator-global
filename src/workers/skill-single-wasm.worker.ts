/**
 * WASM-backed worker for running additional samples for a single skill
 * (Compare Skills / Compare Uniques). Mirrors `skill-single.worker.ts` but
 * routes through the Rust/WASM `runCompare` engine.
 */

import '../polyfills';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import { initUmaSimWasm } from '@/lib/uma-sim-wasm/loader';
import {
  runSamplingFromPlan,
  type SkillSamplingPlan
} from '@/modules/simulation/simulators/wasm-skill-compare';

export type SingleSkillWasmWorkerInMessage =
  | {
      type: 'run';
      skillId: string;
      // Pre-resolved on the main thread; the worker never touches the dataset.
      plan: SkillSamplingPlan;
    }
  | { type: 'terminate' };

export type SingleSkillWasmWorkerOutMessage =
  | { type: 'complete'; skillId: string; results: SkillComparisonResponse }
  | { type: 'error'; skillId: string; error: string };

function sendMessage(message: SingleSkillWasmWorkerOutMessage): void {
  postMessage(message);
}

async function run(message: Extract<SingleSkillWasmWorkerInMessage, { type: 'run' }>) {
  const { skillId, plan } = message;

  await initUmaSimWasm();

  const results: SkillComparisonResponse = await runSamplingFromPlan(plan);

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
