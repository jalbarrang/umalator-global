import { useRunnersStore } from '@/store/runners.store';
import { useSettingsStore, useWitVariance } from '@/store/settings.store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { useMemo, useState } from 'react';
import { useSimulationWorkers } from './useSimulationWorkers';

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

  const { worker1Ref } = useSimulationWorkers();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const handleRunCompare = () => {
    setIsSimulationRunning(true);

    worker1Ref.current?.postMessage({
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

    worker1Ref.current?.postMessage({
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
