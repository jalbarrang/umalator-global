/**
 * WASM-backed pool worker for uma (unique skill) basin simulations. Mirrors
 * `uma-basin.pool.worker.ts` but routes through the Rust/WASM `runCompare`
 * engine. The WASM module is initialized before the worker signals ready so the
 * first batch never races the async load. The worker is data-free: it runs the
 * pre-resolved `SkillSamplingPlan` the pool-manager builds on the main thread.
 */

import type { SkillComparisonResponse } from '@/modules/simulation/types';
import type { WorkerInMessage, WorkerOutMessage } from '../types';
import { initUmaSimWasm, initUmaSimWasmFromModule } from '@/lib/uma-sim-wasm/loader';
import {
  runSamplingFromPlan,
  type SkillSamplingPlan
} from '@/modules/simulation/simulators/wasm-skill-compare';

let workerId = -1;

function sendMessage(message: WorkerOutMessage): void {
  postMessage(message);
}

async function processBatch(batchId: number, plan: SkillSamplingPlan): Promise<void> {
  const results: SkillComparisonResponse = await runSamplingFromPlan(plan);
  sendMessage({ type: 'batch-complete', workerId, batchId, results });
}

self.addEventListener('message', (event: MessageEvent<WorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      workerId = message.workerId;
      (message.compiledModule ? initUmaSimWasmFromModule(message.compiledModule) : initUmaSimWasm())
        .then(() => sendMessage({ type: 'worker-ready', workerId }))
        .catch((error) =>
          sendMessage({
            type: 'worker-error',
            workerId,
            error: error instanceof Error ? error.message : 'Failed to initialize WASM runtime'
          })
        );
      break;

    case 'work-batch':
      processBatch(message.batchId, message.plan).catch((error) =>
        sendMessage({
          type: 'worker-error',
          workerId,
          error: error instanceof Error ? error.message : 'Unknown WASM batch error'
        })
      );
      break;

    case 'terminate':
      self.close();
      break;
  }
});
