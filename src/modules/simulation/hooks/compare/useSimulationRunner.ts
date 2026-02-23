import { useEffect, useMemo, useRef } from 'react';
import CompareWorker from '@workers/simulator.worker.ts?worker';
import type { CompareParams } from '../../types';
import type { CompareResult } from '@/modules/simulation/compare.types';
import {
  setIsSimulationRunning,
  setResults,
  setSimulationProgress,
} from '@/modules/simulation/stores/compare.store';
import { racedefToParams } from '@/utils/races';
import { useSettingsStore, useWitVariance } from '@/store/settings.store';
import { useRunnersStore } from '@/store/runners.store';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';

const createCompareWorker = () => new CompareWorker();

type WorkerMessage<T> =
  | {
      type: 'compare';
      results: T;
    }
  | {
      type: 'compare-complete';
    }
  | {
      type: 'compare-progress';
      currentSamples: number;
      totalSamples: number;
    };

export function useSimulationRunner() {
  const { uma1, uma2 } = useRunnersStore();

  const { racedef, nsamples, courseId } = useSettingsStore();

  const {
    simWitVariance,
    allowRushedUma1,
    allowRushedUma2,
    allowDownhillUma1,
    allowDownhillUma2,
    allowSectionModifierUma1,
    allowSectionModifierUma2,
    allowSkillCheckChanceUma1,
    allowSkillCheckChanceUma2,
  } = useWitVariance();

  const webWorkerRef = useRef<Worker | null>(null);

  const handleWorkerMessage = <T>(event: MessageEvent<WorkerMessage<T>>) => {
    const { type } = event.data;

    console.log('compare:handleWorkerMessage', {
      type,
      data: event.data,
    });

    switch (type) {
      case 'compare':
        setResults(event.data.results as CompareResult);
        break;
      case 'compare-progress':
        setSimulationProgress({
          current: event.data.currentSamples,
          total: event.data.totalSamples,
        });
        break;
      case 'compare-complete':
        setIsSimulationRunning(false);
        setSimulationProgress(null);
        break;
    }
  };

  useEffect(() => {
    const webWorker = createCompareWorker();

    webWorker.addEventListener('message', handleWorkerMessage);

    webWorkerRef.current = webWorker;
    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
      webWorkerRef.current = null;
    };
  }, []);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const handleRunCompare = (seed?: number) => {
    setIsSimulationRunning(true);
    setSimulationProgress(null);

    // Generate random seed if not provided
    const simulationSeed = seed ?? Math.floor(Math.random() * 1000000);

    const params: CompareParams = {
      nsamples,
      course,
      racedef: racedefToParams(racedef),
      uma1: uma1,
      uma2: uma2,
      options: {
        seed: simulationSeed,
        allowRushedUma1: simWitVariance ? allowRushedUma1 : false,
        allowRushedUma2: simWitVariance ? allowRushedUma2 : false,
        allowDownhillUma1: simWitVariance ? allowDownhillUma1 : false,
        allowDownhillUma2: simWitVariance ? allowDownhillUma2 : false,
        allowSectionModifierUma1: simWitVariance ? allowSectionModifierUma1 : false,
        allowSectionModifierUma2: simWitVariance ? allowSectionModifierUma2 : false,
        useEnhancedSpurt: false,
        accuracyMode: false,
        skillCheckChanceUma1: simWitVariance ? allowSkillCheckChanceUma1 : false,
        skillCheckChanceUma2: simWitVariance ? allowSkillCheckChanceUma2 : false,
      },
    };

    webWorkerRef.current?.postMessage({
      msg: 'compare',
      data: params,
    });
  };

  function handleRunOnce(seed?: number) {
    setIsSimulationRunning(true);
    setSimulationProgress(null);

    // Generate random seed if not provided
    const simulationSeed = seed ?? Math.floor(Math.random() * 1000000);

    const params: CompareParams = {
      nsamples: 1,
      course,
      racedef: racedefToParams(racedef),
      uma1: uma1,
      uma2: uma2,
      options: {
        seed: simulationSeed,
        allowRushedUma1: simWitVariance ? allowRushedUma1 : false,
        allowRushedUma2: simWitVariance ? allowRushedUma2 : false,
        allowDownhillUma1: simWitVariance ? allowDownhillUma1 : false,
        allowDownhillUma2: simWitVariance ? allowDownhillUma2 : false,
        allowSectionModifierUma1: simWitVariance ? allowSectionModifierUma1 : false,
        allowSectionModifierUma2: simWitVariance ? allowSectionModifierUma2 : false,
        useEnhancedSpurt: false,
        accuracyMode: false,
        skillCheckChanceUma1: simWitVariance ? allowSkillCheckChanceUma1 : false,
        skillCheckChanceUma2: simWitVariance ? allowSkillCheckChanceUma2 : false,
      },
    };

    webWorkerRef.current?.postMessage({
      msg: 'compare',
      data: params,
    });
  }

  return { handleRunCompare, handleRunOnce };
}
