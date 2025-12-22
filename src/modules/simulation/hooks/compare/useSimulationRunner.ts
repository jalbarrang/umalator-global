import {
  setIsSimulationRunning,
  setResults,
  setSimulationProgress,
} from '@simulation/stores/compare.store';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { useEffect, useMemo, useRef, useState } from 'react';
import CompareWorker from '@workers/simulator.worker.ts?worker';
import type { CompareResult } from '@simulation/compare.types';
import { PosKeepMode } from '@/modules/simulation/lib/runner/definitions';
import { racedefToParams } from '@/utils/races';
import { useSettingsStore, useWitVariance } from '@/store/settings.store';
import { useRunnersStore } from '@/store/runners.store';

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
  const { uma1, uma2, pacer } = useRunnersStore();

  const { racedef, nsamples, seed, posKeepMode, pacemakerCount, courseId } = useSettingsStore();

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

  const [runOnceCounter, setRunOnceCounter] = useState(0);

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

  const handleRunCompare = () => {
    setIsSimulationRunning(true);
    setSimulationProgress(null);

    webWorkerRef.current?.postMessage({
      msg: 'compare',
      data: {
        nsamples,
        course,
        racedef: racedefToParams(racedef),
        uma1: uma1,
        uma2: uma2,
        pacer: pacer,
        options: {
          seed,
          posKeepMode,
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
          pacemakerCount: posKeepMode === PosKeepMode.Virtual ? pacemakerCount : 1,
        },
      },
    });
  };

  function handleRunOnce() {
    setIsSimulationRunning(true);
    setSimulationProgress(null);
    const effectiveSeed = seed + runOnceCounter;
    setRunOnceCounter((prev) => prev + 1);

    webWorkerRef.current?.postMessage({
      msg: 'compare',
      data: {
        nsamples: 1,
        course,
        racedef: racedefToParams(racedef),
        uma1: uma1,
        uma2: uma2,
        pacer: pacer,
        options: {
          seed: effectiveSeed,
          posKeepMode,
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
          pacemakerCount: posKeepMode === PosKeepMode.Virtual ? pacemakerCount : 1,
        },
      },
    });
  }

  return { handleRunCompare, handleRunOnce };
}
