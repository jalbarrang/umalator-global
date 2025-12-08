import { useRunnersStore } from '@/store/runners.store';
import { useSettingsStore, useWitVariance } from '@/store/settings.store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { useEffect, useMemo, useRef, useState } from 'react';
import { setResults } from '../../stores/compare.store';
import { CompareResult } from '../../compare.types';

type WorkerMessage<T> = {
  type: 'compare' | 'compare-complete';
  results: T;
};

export function useSimulationRunner() {
  const { uma1, uma2, pacer } = useRunnersStore();

  const { racedef, nsamples, seed, posKeepMode, pacemakerCount, courseId } =
    useSettingsStore();

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
    const { type, results } = event.data;

    console.log('compare:handleWorkerMessage', {
      type,
      results,
    });

    switch (type) {
      case 'compare':
        setResults(results as CompareResult);
        break;
      case 'compare-complete':
        setIsSimulationRunning(false);
        break;
    }
  };

  useEffect(() => {
    const webWorker = new Worker(
      new URL('@/workers/simulator.worker.ts', import.meta.url),
      { type: 'module' },
    );

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
          allowSectionModifierUma1: simWitVariance
            ? allowSectionModifierUma1
            : false,
          allowSectionModifierUma2: simWitVariance
            ? allowSectionModifierUma2
            : false,
          useEnhancedSpurt: false,
          accuracyMode: false,
          skillCheckChanceUma1: simWitVariance
            ? allowSkillCheckChanceUma1
            : false,
          skillCheckChanceUma2: simWitVariance
            ? allowSkillCheckChanceUma2
            : false,
          pacemakerCount:
            posKeepMode === PosKeepMode.Virtual ? pacemakerCount : 1,
        },
      },
    });
  };

  function handleRunOnce() {
    setIsSimulationRunning(true);
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
          allowSectionModifierUma1: simWitVariance
            ? allowSectionModifierUma1
            : false,
          allowSectionModifierUma2: simWitVariance
            ? allowSectionModifierUma2
            : false,
          useEnhancedSpurt: false,
          accuracyMode: false,
          skillCheckChanceUma1: simWitVariance
            ? allowSkillCheckChanceUma1
            : false,
          skillCheckChanceUma2: simWitVariance
            ? allowSkillCheckChanceUma2
            : false,
          pacemakerCount:
            posKeepMode === PosKeepMode.Virtual ? pacemakerCount : 1,
        },
      },
    });
  }

  return { handleRunCompare, handleRunOnce };
}
