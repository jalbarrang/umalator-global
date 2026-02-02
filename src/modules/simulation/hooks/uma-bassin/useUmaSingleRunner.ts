import { useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import SkillSingleWorker from '@workers/skill-single.worker.ts?worker';
import type {
  SingleSkillWorkerInMessage,
  SingleSkillWorkerOutMessage,
} from '@/workers/skill-single.worker';
import type { SimulationParams } from '@/workers/pool/types';
import {
  appendResultsToTable,
  setSkillLoading,
  useUniqueSkillBasinStore,
} from '@/modules/simulation/stores/uma-basin.store';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { racedefToParams } from '@/utils/races';
import { defaultSimulationOptions } from '@/components/bassin-chart/utils';

/**
 * Hook for running additional samples for a single skill in Uma Basin
 * Uses a dedicated worker to run simulations without blocking the UI
 */
export function useUmaSingleRunner() {
  const { pacer } = useRunnersStore();
  const { runner } = useRunner();
  const { racedef, courseId } = useSettingsStore();
  const { seed: currentSeed, results } = useUniqueSkillBasinStore(
    useShallow((state) => ({ seed: state.seed, results: state.results })),
  );

  const workerRef = useRef<Worker | null>(null);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  /**
   * Run additional samples for a specific skill
   * @param skillId - The skill ID to run additional samples for
   * @param additionalSamples - Number of additional samples to run (default: 100)
   */
  const runAdditionalSamples = useCallback(
    (skillId: string, additionalSamples = 100) => {
      // Validation checks
      if (currentSeed === null) {
        console.error('Cannot run additional samples: no seed available');
        return;
      }

      const skillResult = results[skillId];
      if (!skillResult) {
        console.error(`Cannot run additional samples: skill ${skillId} not found in results`);
        return;
      }

      const currentRunCount = skillResult.results.length;

      // Calculate new seed: currentSeed + currentRunCount + 1
      const newSeed = currentSeed + currentRunCount + 1;

      // Set loading state for this skill
      setSkillLoading(skillId, true);

      // Terminate existing worker if any
      if (workerRef.current) {
        workerRef.current.terminate();
      }

      // Create new worker
      const worker = new SkillSingleWorker();
      workerRef.current = worker;

      // Set up message handler
      worker.onmessage = (event: MessageEvent<SingleSkillWorkerOutMessage>) => {
        const message = event.data;

        switch (message.type) {
          case 'complete': {
            // Merge results into the store
            appendResultsToTable(message.results);

            // Clear loading state
            setSkillLoading(skillId, false);

            // Terminate worker
            worker.terminate();
            workerRef.current = null;

            console.log(`Completed ${additionalSamples} additional samples for skill ${skillId}`);
            break;
          }

          case 'error': {
            console.error(`Error running additional samples for ${skillId}:`, message.error);

            // Clear loading state
            setSkillLoading(skillId, false);

            // Terminate worker
            worker.terminate();
            workerRef.current = null;
            break;
          }
        }
      };

      worker.onerror = (error) => {
        console.error('Worker error:', error);
        setSkillLoading(skillId, false);
        worker.terminate();
        workerRef.current = null;
      };

      // Prepare simulation params
      const params = racedefToParams(racedef, runner.strategy);
      const simulationParams: SimulationParams = {
        course,
        racedef: params,
        uma: runner,
        pacer: pacer,
        options: defaultSimulationOptions,
      };

      // Send run message to worker
      const runMessage: SingleSkillWorkerInMessage = {
        type: 'run',
        skillId,
        nsamples: additionalSamples,
        seed: newSeed,
        params: simulationParams,
      };

      worker.postMessage(runMessage);

      console.log(
        `Started ${additionalSamples} additional samples for skill ${skillId} with seed ${newSeed}`,
      );
    },
    [currentSeed, results, course, racedef, runner, pacer],
  );

  /**
   * Cancel any running worker
   */
  const cancelAdditionalSamples = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return {
    runAdditionalSamples,
    cancelAdditionalSamples,
  };
}
