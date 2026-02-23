/**
 * # useSkillPlannerOptimizer Hook
 *
 * Manages the skill planner web worker lifecycle and optimization state.
 *
 * ## Responsibilities
 *
 * - Initialize and cleanup worker
 * - Handle worker messages (progress, result, error)
 * - Update skill planner store state
 * - Provide optimization control functions
 */

import { useEffect, useMemo, useRef } from 'react';
import SkillPlannerWorker from '@workers/skill-planner.worker.ts?worker';
import {
  setIsOptimizing,
  setProgress,
  setResult,
  useSkillPlannerStore,
} from '../skill-planner.store';
import type { OptimizationProgress, OptimizationResult } from '../types';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { racedefToParams } from '@/utils/races';
import { useSettingsStore } from '@/store/settings.store';
import { defaultSimulationOptions } from '@/components/bassin-chart/utils';

const createSkillPlannerWorker = () => new SkillPlannerWorker();

type WorkerMessage =
  | {
      type: 'skill-planner-progress';
      progress: OptimizationProgress;
    }
  | {
      type: 'skill-planner-result';
      result: OptimizationResult;
    }
  | {
      type: 'skill-planner-done';
    }
  | {
      type: 'skill-planner-error';
      error: string;
    };

export function useSkillPlannerOptimizer() {
  const { runner, candidates, budget, obtainedSkills } = useSkillPlannerStore();
  const { courseId, racedef } = useSettingsStore();

  const webWorkerRef = useRef<Worker | null>(null);

  // Transform course and race parameters
  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);
  const raceParams = useMemo(() => racedefToParams(racedef), [racedef]);

  // Worker message handler
  const handleWorkerMessage = (event: MessageEvent<WorkerMessage>) => {
    const { type } = event.data;

    console.log('skill-planner:handleWorkerMessage', {
      type,
      data: event.data,
    });

    switch (type) {
      case 'skill-planner-progress':
        setProgress(event.data.progress);
        break;
      case 'skill-planner-result':
        setResult(event.data.result);
        break;
      case 'skill-planner-done':
        setIsOptimizing(false);
        setProgress(null);
        break;
      case 'skill-planner-error':
        console.error('Optimization error:', event.data.error);
        setIsOptimizing(false);
        setProgress(null);
        setResult(null);
        break;
    }
  };

  // Initialize worker on mount
  useEffect(() => {
    const webWorker = createSkillPlannerWorker();

    webWorker.addEventListener('message', handleWorkerMessage);

    webWorkerRef.current = webWorker;

    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
      webWorkerRef.current = null;
    };
  }, []);

  // Start optimization
  const handleOptimize = () => {
    if (!webWorkerRef.current) {
      console.error('Worker not initialized');
      return;
    }

    // Clear previous results
    setResult(null);
    setProgress(null);
    setIsOptimizing(true);

    // Generate random seed
    const seed = Math.floor(Math.random() * 1000000);

    // Send optimization request to worker
    webWorkerRef.current.postMessage({
      msg: 'optimize',
      data: {
        candidates,
        obtainedSkills,
        budget,
        runner,
        course,
        racedef: raceParams,
        options: {
          ...defaultSimulationOptions,
          seed,
        },
      },
    });
  };

  // Cancel optimization
  const handleCancel = () => {
    if (!webWorkerRef.current) {
      return;
    }

    // Terminate and recreate worker
    webWorkerRef.current.terminate();

    const newWorker = createSkillPlannerWorker();
    newWorker.addEventListener('message', handleWorkerMessage);
    webWorkerRef.current = newWorker;

    // Reset state
    setIsOptimizing(false);
    setProgress(null);
  };

  return {
    handleOptimize,
    handleCancel,
  };
}
