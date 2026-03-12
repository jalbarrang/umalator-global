import { useCallback, useEffect, useMemo, useRef } from 'react';
import UmaBasinWorker from '@workers/uma-basin.worker.ts?worker';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import {
  appendResultsToTable,
  resetTable,
  setIsSimulationRunning,
  setMetrics,
  setTable,
} from '@/modules/simulation/stores/uma-basin.store';
import {
  defaultSimulationOptions,
  getActivateableSkills,
  getNullSkillComparisonRow,
} from '@/components/bassin-chart/utils';
import { uniqueSkillIds } from '@/modules/skills/utils';
import { useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { syncWorkerRuntimeData } from '@/modules/data/worker-sync';

const createUmaBasinWorker = () => new UmaBasinWorker();

type WorkerMessage<T> =
  | { type: 'data-ready'; resourceVersion: string }
  | { type: 'worker-error'; error: string }
  | { type: 'uma-bassin'; results: T }
  | { type: 'uma-bassin-done' };

const WORKER_COUNT = 2;
// Total samples per skill: 5 + 20 + 50 + 200 = 275 (for skills that pass all filters)
const SAMPLES_PER_STAGE = [5, 20, 50, 200];

function removeUniqueSkillsFromRunner(uma: RunnerState): RunnerState {
  const filteredSkills = uma.skills.filter((skillId) => !uniqueSkillIds.includes(skillId));

  return { ...uma, skills: filteredSkills };
}

export function useUmaBasinRunner() {
  const { runner } = useRunner();
  const { racedef, courseId } = useSettingsStore();

  const worker1Ref = useRef<Worker | null>(null);
  const worker2Ref = useRef<Worker | null>(null);
  const chartWorkersCompletedRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const totalSkillsRef = useRef<number>(0);

  const handleWorkerMessage = useCallback(
    (event: MessageEvent<WorkerMessage<SkillComparisonResponse>>) => {
      const { type } = event.data;

      console.log('uma-bassin:handleWorkerMessage', {
        type,
        data: event.data,
      });

      switch (type) {
        case 'worker-error':
          console.error('Uma basin worker error:', event.data.error);
          setIsSimulationRunning(false);
          break;
        case 'uma-bassin':
          appendResultsToTable(event.data.results);
          break;
        case 'uma-bassin-done':
          chartWorkersCompletedRef.current += 1;

          if (chartWorkersCompletedRef.current >= WORKER_COUNT) {
            const timeTaken = performance.now() - startTimeRef.current;

            // Calculate total samples (estimated based on progressive filtering)
            // Each skill goes through at least stage 1 (5 samples)
            // Filtered skills stop early, remaining go through all stages
            const totalSamples =
              totalSkillsRef.current * SAMPLES_PER_STAGE.reduce((a, b) => a + b, 0);

            setMetrics({
              timeTaken: Math.round(timeTaken),
              totalSamples,
              workerCount: WORKER_COUNT,
              skillsProcessed: totalSkillsRef.current,
            });

            setIsSimulationRunning(false);
            chartWorkersCompletedRef.current = 0;
          }

          break;
      }
    },
    [],
  );

  useEffect(() => {
    const webWorker = createUmaBasinWorker();

    webWorker.addEventListener('message', handleWorkerMessage);
    worker1Ref.current = webWorker;

    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
    };
  }, [handleWorkerMessage]);

  useEffect(() => {
    const webWorker = createUmaBasinWorker();

    webWorker.addEventListener('message', handleWorkerMessage);
    worker2Ref.current = webWorker;

    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
    };
  }, [handleWorkerMessage]);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  function doBasinnChart() {
    startTimeRef.current = performance.now();
    setIsSimulationRunning(true);

    chartWorkersCompletedRef.current = 0;
    const params = racedefToParams(racedef, runner.strategy);

    const skills = getActivateableSkills(uniqueSkillIds, runner, course, params);

    totalSkillsRef.current = skills.length;

    const umaWithoutUniques = removeUniqueSkillsFromRunner(runner);
    const uma = umaWithoutUniques;

    const filler: SkillComparisonResponse = {};

    skills.forEach((id) => (filler[id] = getNullSkillComparisonRow(id)));

    const skills1 = skills.slice(0, Math.floor(skills.length / 2));
    const skills2 = skills.slice(Math.floor(skills.length / 2));

    resetTable();
    setTable(filler);

    // Generate random seed
    const seed = Math.floor(Math.random() * 1000000);

    const worker1 = worker1Ref.current;
    const worker2 = worker2Ref.current;
    if (!worker1 || !worker2) {
      setIsSimulationRunning(false);
      return;
    }

    void Promise.all([syncWorkerRuntimeData(worker1), syncWorkerRuntimeData(worker2)])
      .then(() => {
        worker1.postMessage({
          type: 'chart',
          data: {
            skills: skills1,
            course,
            racedef: params,
            uma,
            options: {
              ...defaultSimulationOptions,
              seed,
            },
          },
        });

        worker2.postMessage({
          type: 'chart',
          data: {
            skills: skills2,
            course,
            racedef: params,
            uma,
            options: {
              ...defaultSimulationOptions,
              seed,
            },
          },
        });
      })
      .catch((error: unknown) => {
        console.error('Failed to sync uma basin workers:', error);
        setIsSimulationRunning(false);
      });
  }

  return { doBasinnChart };
}
