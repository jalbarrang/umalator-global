/**
 * Pool Worker for uma (unique skill) basin simulations
 * Processes batches of skills and reports results back to pool manager
 */

import { clone, cloneDeepWith } from 'es-toolkit';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import type { SimulationParams, WorkBatch, WorkerInMessage, WorkerOutMessage } from '../types';
import { runSampling } from '@/modules/simulation/simulators/unique-compare';

let workerId = -1;
let simulationParams: SimulationParams | null = null;

function sendMessage(message: WorkerOutMessage): void {
  postMessage(message);
}

function processBatch(batch: WorkBatch): void {
  if (!simulationParams) {
    sendMessage({
      type: 'worker-error',
      workerId,
      error: 'Worker not initialized',
    });

    return;
  }

  const { course, racedef, uma, options } = simulationParams;

  // Prepare uma with proper skill arrays
  const baseRunner = cloneDeepWith(uma, (value, key) => {
    if (key === 'skills') return clone(value);
  });

  const roundParams = {
    nsamples: batch.nsamples,
    skills: batch.skills,
    course,
    racedef,
    uma: baseRunner,
    options,
  };

  // Run simulation for this batch
  const results: SkillComparisonResponse = runSampling(roundParams);

  // Send results back to pool manager
  sendMessage({
    type: 'batch-complete',
    workerId,
    batchId: batch.batchId,
    results,
  });
}

self.addEventListener('message', (event: MessageEvent<WorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      workerId = message.workerId;
      simulationParams = message.params;

      // Signal ready for work
      sendMessage({
        type: 'worker-ready',
        workerId,
      });
      break;

    case 'work-batch':
      processBatch(message.batch);
      break;

    case 'terminate':
      self.close();
      break;
  }
});
