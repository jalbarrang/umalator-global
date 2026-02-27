import { useCallback, useEffect, useMemo, useRef } from 'react';
import SkillBasinWorker from '@workers/skill-basin.worker.ts?worker';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import {
  appendResultsToTable,
  resetTable,
  setIsSimulationRunning,
  setMetrics,
  setTable,
} from '@/modules/simulation/stores/skill-basin.store';
import {
  defaultSimulationOptions,
  getActivateableSkills,
  getNullSkillComparisonRow,
} from '@/components/bassin-chart/utils';

import { racedefToParams } from '@/utils/races';
import { useSettingsStore } from '@/store/settings.store';
import { useRunner } from '@/store/runners.store';
import { getBaseSkillsToTest } from '@/modules/skills/utils';

const baseSkillsToTest = getBaseSkillsToTest();

const createSkillBasinWorker = () => new SkillBasinWorker();

type WorkerMessage<T> = {
  type: 'skill-bassin' | 'skill-bassin-done';
  results: T;
};

const WORKER_COUNT = 2;
// Total samples per skill: 5 + 20 + 50 + 200 = 275 (for skills that pass all filters)
const SAMPLES_PER_STAGE = [5, 20, 50, 200];

export function useSkillBasinRunner() {
  const { runner } = useRunner();
  const { racedef, courseId } = useSettingsStore();

  const worker1Ref = useRef<Worker | null>(null);
  const worker2Ref = useRef<Worker | null>(null);
  const chartWorkersCompletedRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const totalSkillsRef = useRef<number>(0);

  const handleWorkerMessage = useCallback(
    (event: MessageEvent<WorkerMessage<SkillComparisonResponse>>) => {
      const { type, results } = event.data;

      console.log('skill-bassin:handleWorkerMessage', {
        type,
        results,
      });

      switch (type) {
        case 'skill-bassin':
          appendResultsToTable(results);
          break;
        case 'skill-bassin-done':
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
    const webWorker = new Worker(new URL('@/workers/skill-basin.worker.ts', import.meta.url), {
      type: 'module',
    });

    webWorker.addEventListener('message', handleWorkerMessage);
    worker1Ref.current = webWorker;

    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
    };
  }, [handleWorkerMessage]);

  useEffect(() => {
    const webWorker = createSkillBasinWorker();

    webWorker.addEventListener('message', handleWorkerMessage);
    worker2Ref.current = webWorker;
    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
    };
  }, [handleWorkerMessage]);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const doBasinnChart = () => {
    startTimeRef.current = performance.now();
    setIsSimulationRunning(true);

    chartWorkersCompletedRef.current = 0;
    const params = racedefToParams(racedef, runner.strategy);

    const skills = getActivateableSkills(
      baseSkillsToTest.filter(
        (skillId) =>
          !runner.skills.includes(skillId) &&
          (!skillId.startsWith('9') || !runner.skills.includes('1' + skillId.slice(1))),
      ),
      runner,
      course,
      params,
    );

    totalSkillsRef.current = skills.length;

    const uma = runner;

    const filler: SkillComparisonResponse = {};
    skills.forEach((id) => (filler[id] = getNullSkillComparisonRow(id)));

    const skills1 = skills.slice(0, Math.floor(skills.length / 2));
    const skills2 = skills.slice(Math.floor(skills.length / 2));

    resetTable();
    setTable(filler);

    // Generate random seed
    const seed = Math.floor(Math.random() * 1000000);

    worker1Ref.current?.postMessage({
      msg: 'chart',
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

    worker2Ref.current?.postMessage({
      msg: 'chart',
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
  };

  return { doBasinnChart };
}
