import { useCallback, useEffect, useRef } from 'react';
import SkillPlannerWorker from '@workers/skill-planner.worker.ts?worker';
import { setIsOptimizing, setProgress, setResult } from '../store';
import type { CandidateSkill } from '../types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { racedefToParams } from '@/utils/races';
import { defaultSimulationOptions } from '@/components/bassin-chart/utils';

export function useSkillPlannerWorker() {
  const workerRef = useRef<Worker | null>(null);
  const { pacer } = useRunnersStore();
  const { runner } = useRunner();
  const { racedef, seed, courseId } = useSettingsStore();

  // Initialize worker
  useEffect(() => {
    workerRef.current = new SkillPlannerWorker();

    const worker = workerRef.current;

    worker.addEventListener('message', (e: MessageEvent) => {
      const { type, ...data } = e.data;

      switch (type) {
        case 'combinations-generated':
          console.log(`Generated ${data.count} combinations to test`);
          break;

        case 'progress':
          setProgress({
            completed: data.completed,
            total: data.total,
            currentBest: data.currentBest,
          });
          break;

        case 'complete':
          setResult(data.result);
          setIsOptimizing(false);
          break;

        case 'error':
          console.error('Optimization error:', data.error);
          setIsOptimizing(false);
          break;
      }
    });

    return () => {
      worker.terminate();
    };
  }, []);

  const startOptimization = useCallback(
    (candidates: Array<CandidateSkill>, budget: number) => {
      if (!workerRef.current) {
        console.error('Worker not initialized');
        return;
      }

      setIsOptimizing(true);
      setResult(null);
      setProgress(null);

      const course = CourseHelpers.getCourse(courseId);
      const params = racedefToParams(racedef, runner.strategy);

      workerRef.current.postMessage({
        msg: 'optimize',
        data: {
          candidates: Array.from(candidates),
          budget,
          course,
          racedef: params,
          runner,
          pacer,
          options: {
            ...defaultSimulationOptions,
            seed,
          },
        },
      });
    },
    [courseId, pacer, racedef, runner, seed],
  );

  const cancelOptimization = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = new SkillPlannerWorker();
      setIsOptimizing(false);
      setProgress(null);
    }
  }, []);

  return { startOptimization, cancelOptimization };
}

