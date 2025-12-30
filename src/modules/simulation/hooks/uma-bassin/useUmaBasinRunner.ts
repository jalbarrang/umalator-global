import { useCallback, useEffect, useMemo, useRef } from 'react';
import UmaBasinWorker from '@workers/uma-basin.worker.ts?worker';
import type { SkillBasinResponse } from '@/modules/simulation/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
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
  getNullRow,
} from '@/components/bassin-chart/utils';
import { uniqueSkillIds } from '@/modules/skills/utils';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { racedefToParams } from '@/utils/races';

const createUmaBasinWorker = () => new UmaBasinWorker();

type WorkerMessage<T> = {
  type: 'uma-bassin' | 'uma-bassin-done';
  results: T;
};

const WORKER_COUNT = 2;
// Total samples per skill: 5 + 20 + 50 + 200 = 275 (for skills that pass all filters)
const SAMPLES_PER_STAGE = [5, 20, 50, 200];

function removeUniqueSkillsFromRunner(uma: RunnerState): RunnerState {
  const filteredSkills = uma.skills.filter((skillId) => !uniqueSkillIds.includes(skillId));

  return { ...uma, skills: filteredSkills };
}

export function useUmaBasinRunner() {
  const { pacer } = useRunnersStore();
  const { runner } = useRunner();
  const { racedef, seed, courseId } = useSettingsStore();

  const worker1Ref = useRef<Worker | null>(null);
  const worker2Ref = useRef<Worker | null>(null);
  const chartWorkersCompletedRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const totalSkillsRef = useRef<number>(0);

  const handleWorkerMessage = useCallback(
    (event: MessageEvent<WorkerMessage<SkillBasinResponse>>) => {
      const { type, results } = event.data;

      console.log('uma-bassin:handleWorkerMessage', {
        type,
        results,
      });

      switch (type) {
        case 'uma-bassin':
          appendResultsToTable(results);
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

    const filler: SkillBasinResponse = new Map();

    skills.forEach((id) => filler.set(id, getNullRow(id)));

    const skills1 = skills.slice(0, Math.floor(skills.length / 2));
    const skills2 = skills.slice(Math.floor(skills.length / 2));

    resetTable();
    setTable(filler);

    worker1Ref.current?.postMessage({
      msg: 'chart',
      data: {
        skills: skills1,
        course,
        racedef: params,
        uma,
        pacer: pacer,
        options: {
          ...defaultSimulationOptions,
          seed,
        },
      },
    });

    worker2Ref.current?.postMessage({
      msg: 'chart',
      data: {
        skills: skills2,
        course,
        racedef: params,
        uma,
        pacer: pacer,
        options: {
          ...defaultSimulationOptions,
          seed,
        },
      },
    });
  }

  return { doBasinnChart };
}
