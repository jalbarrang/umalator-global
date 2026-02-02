/**
 * Worker for running additional samples for a single skill
 * Used when user wants to run more samples on a specific skill from ActivationDetails
 */

import { clone, cloneDeepWith } from 'es-toolkit';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import type { SimulationParams } from './pool/types';
import { runSampling } from '@/modules/simulation/simulators/skill-compare';

// Messages from main thread to worker
export type SingleSkillWorkerInMessage =
  | {
      type: 'run';
      skillId: string;
      nsamples: number;
      seed: number;
      params: SimulationParams;
    }
  | { type: 'terminate' };

// Messages from worker to main thread
export type SingleSkillWorkerOutMessage =
  | { type: 'complete'; skillId: string; results: SkillComparisonResponse }
  | { type: 'error'; skillId: string; error: string };

function sendMessage(message: SingleSkillWorkerOutMessage): void {
  postMessage(message);
}

self.addEventListener('message', (event: MessageEvent<SingleSkillWorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'run': {
      try {
        const { skillId, nsamples, seed, params } = message;
        const { course, racedef, uma, pacer, options } = params;

        // Prepare uma and pacer with proper skill arrays
        const baseRunner = cloneDeepWith(uma, (value, key) => {
          if (key === 'skills') return clone(value);
        });

        let basePacer = null;
        if (pacer) {
          basePacer = cloneDeepWith(pacer, (value, key) => {
            if (key === 'skills') return clone(value);
          });
        }

        // Run simulation for this single skill
        const roundParams = {
          nsamples,
          skills: [skillId],
          course,
          racedef,
          uma: baseRunner,
          pacer: basePacer,
          options: {
            ...options,
            seed,
          },
        };

        const results: SkillComparisonResponse = runSampling(roundParams);

        // Send results back
        sendMessage({
          type: 'complete',
          skillId,
          results,
        });
      } catch (error) {
        sendMessage({
          type: 'error',
          skillId: message.skillId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      break;
    }

    case 'terminate':
      self.close();
      break;
  }
});
