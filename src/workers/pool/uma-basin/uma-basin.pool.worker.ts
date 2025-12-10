/**
 * Pool Worker for uma (unique skill) basin simulations
 * Processes batches of skills and reports results back to pool manager
 */

import { run1Round } from '@/utils/compare';
import type { SkillBasinResponse } from '@simulation/types';
import type {
  SimulationParams,
  WorkBatch,
  WorkerInMessage,
  WorkerOutMessage,
} from '../types';

let workerId: number = -1;
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

  const { course, racedef, uma, pacer, options } = simulationParams;

  // Prepare uma and pacer with proper skill arrays
  const uma_ = {
    ...uma,
    skills: [...uma.skills],
    forcedSkillPositions: { ...uma.forcedSkillPositions },
  };

  let pacer_ = null;
  if (pacer) {
    pacer_ = {
      ...pacer,
      skills: [...pacer.skills],
      forcedSkillPositions: { ...pacer.forcedSkillPositions },
    };
  }

  // Run simulation for this batch
  const results: SkillBasinResponse = run1Round({
    nsamples: batch.nsamples,
    skills: batch.skills,
    course,
    racedef,
    uma: uma_,
    pacer: pacer_,
    options: {
      ...options,
      includeRunData: batch.includeRunData,
    },
  });

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
