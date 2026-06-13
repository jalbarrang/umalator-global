import { useCallback, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/shallow';
import SkillSingleWasmWorker from '@workers/skill-single-wasm.worker.ts?worker';
import type {
  SingleSkillWasmWorkerInMessage as SingleSkillWorkerInMessage,
  SingleSkillWasmWorkerOutMessage as SingleSkillWorkerOutMessage
} from '@/workers/skill-single-wasm.worker';
import { buildSkillSamplingPlan } from '@/modules/simulation/simulators/wasm-skill-compare-plan';
import {
  appendSingleSkillResult,
  setSkillLoading,
  useSkillBasinStore
} from '@/modules/simulation/stores/skill-basin.store';
import { useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useSkillPlannerStore } from '@/modules/skill-planner/skill-planner.store';
import { racedefToParams } from '@/utils/races';
import { defaultSimulationOptions } from '@/components/bassin-chart/utils';
import { coursesService } from '@/modules/data/services/CourseService';

/**
 * Hook for running additional samples for a single skill
 * Uses a dedicated worker to run simulations without blocking the UI
 */
export function useSkillSingleRunner() {
  const { runner } = useRunner();
  const { racedef, courseId } = useSettingsStore();
  const ignoreStaminaConsumption = useSkillPlannerStore((state) => state.ignoreStaminaConsumption);
  const { seed: currentSeed, results } = useSkillBasinStore(
    useShallow((state) => ({ seed: state.seed, results: state.results }))
  );

  const workerRef = useRef<Worker | null>(null);

  const course = useMemo(() => coursesService.getSimCourse(courseId), [courseId]);

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

      // Create new worker (Rust/WASM engine)
      const worker = new SkillSingleWasmWorker();
      workerRef.current = worker;

      // Set up message handler
      worker.onmessage = (event: MessageEvent<SingleSkillWorkerOutMessage>) => {
        const message = event.data;

        switch (message.type) {
          case 'complete': {
            // Merge results into the store
            const result = message.results[skillId];
            appendSingleSkillResult(skillId, result);

            // Clear loading state
            setSkillLoading(skillId, false);

            // Terminate worker
            worker.terminate();
            workerRef.current = null;

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

      // Resolve skills/uma data into a data-free plan on the main thread; the
      // worker runs + reduces it without touching the dataset.
      const params = racedefToParams(racedef, runner.strategy);
      const plan = buildSkillSamplingPlan({
        nsamples: additionalSamples,
        skills: [skillId],
        course,
        racedef: params,
        uma: runner,
        options: {
          ...defaultSimulationOptions,
          ignoreStaminaConsumption,
          seed: newSeed
        }
      });

      // Send run message to worker
      const runMessage: SingleSkillWorkerInMessage = {
        type: 'run',
        skillId,
        plan
      };

      worker.postMessage(runMessage);
      console.log(
        `Started ${additionalSamples} additional samples for skill ${skillId} with seed ${newSeed}`
      );
    },
    [currentSeed, results, course, racedef, runner, ignoreStaminaConsumption]
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
    cancelAdditionalSamples
  };
}
