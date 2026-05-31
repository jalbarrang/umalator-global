/**
 * WASM-backed pool worker for skill basin simulations. Mirrors
 * `skill-basin.pool.worker.ts` but routes through the Rust/WASM `runCompare`
 * engine. The WASM module is initialized before the worker signals ready so the
 * first batch never races the async load.
 */

import { clone, cloneDeepWith } from 'es-toolkit';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import type { SimulationParams, WorkBatch, WorkerInMessage, WorkerOutMessage } from '../types';
import { initUmaSimWasm } from '@/lib/uma-sim-wasm/loader';
import { runSamplingWasm } from '@/modules/simulation/simulators/wasm-skill-compare';

let workerId = -1;
let simulationParams: SimulationParams | null = null;

function sendMessage(message: WorkerOutMessage): void {
  postMessage(message);
}

async function processBatch(batch: WorkBatch): Promise<void> {
  if (!simulationParams) {
    sendMessage({ type: 'worker-error', workerId, error: 'Worker not initialized' });
    return;
  }

  const { course, racedef, uma, options } = simulationParams;

  const baseRunner = cloneDeepWith(uma, (value, key) => {
    if (key === 'skills') return clone(value);
  });

  const results: SkillComparisonResponse = await runSamplingWasm({
    nsamples: batch.nsamples,
    skills: batch.skills,
    course,
    racedef,
    uma: baseRunner,
    options
  });

  sendMessage({ type: 'batch-complete', workerId, batchId: batch.batchId, results });
}

self.addEventListener('message', (event: MessageEvent<WorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      workerId = message.workerId;
      simulationParams = message.params;
      initUmaSimWasm()
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
      processBatch(message.batch).catch((error) =>
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
