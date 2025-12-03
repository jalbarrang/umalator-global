import {
  getActivateableSkills,
  getNullRow,
} from '@/components/bassin-chart/BasinnChart';
import { getBaseSkillsToTest, getUniqueSkills } from '@/modules/skills/utils';
import { updateTableData } from '@/store/chart.store';
import { useRunnersStore } from '@/store/runners.store';
import { useSettingsStore, useWitVariance } from '@/store/settings.store';
import { setIsSimulationRunning, useUIStore } from '@/store/ui.store';
import { racedefToParams } from '@/utils/races';
import { Mode } from '@/utils/settings';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { useMemo, useState } from 'react';
import { useSimulationWorkers } from './useSimulationWorkers';
import { RunnerState } from '@/modules/runners/components/runner-card/types';

const baseSkillsToTest = getBaseSkillsToTest();

function removeUniqueSkillsFromRunner(uma: RunnerState): RunnerState {
  const uniqueSkills = getUniqueSkills();

  const filteredSkills = uma.skills.filter(
    (skillId) => !uniqueSkills.includes(skillId),
  );

  return { ...uma, skills: filteredSkills };
}

export function useSimulationRunner() {
  const { uma1, uma2, pacer } = useRunnersStore();
  const { racedef, nsamples, seed, posKeepMode, pacemakerCount, courseId } =
    useSettingsStore();
  const { mode } = useUIStore();
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

  const { worker1Ref, worker2Ref, chartWorkersCompletedRef } =
    useSimulationWorkers();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  function doBasinnChart() {
    window.dispatchEvent(new CustomEvent('doBasinnChart', {}));
    chartWorkersCompletedRef.current = 0;
    setIsSimulationRunning(true);
    const params = racedefToParams(racedef, uma1.strategy);

    let skills: string[];
    let uma: RunnerState;

    if (mode === Mode.UniquesChart) {
      const uniqueSkills = getUniqueSkills();
      skills = getActivateableSkills(uniqueSkills, uma1, course, params);

      const umaWithoutUniques = removeUniqueSkillsFromRunner(uma1);
      uma = umaWithoutUniques;
    } else {
      skills = getActivateableSkills(
        baseSkillsToTest.filter(
          (skillId) =>
            !uma1.skills.includes(skillId) &&
            (!skillId.startsWith('9') ||
              !uma1.skills.includes('1' + skillId.slice(1))),
        ),
        uma1,
        course,
        params,
      );

      uma = uma1;
    }

    const filler = new Map();
    skills.forEach((id) => filler.set(id, getNullRow(id)));
    const skills1 = skills.slice(0, Math.floor(skills.length / 2));
    const skills2 = skills.slice(Math.floor(skills.length / 2));
    updateTableData('reset');
    updateTableData(filler);

    worker1Ref.current?.postMessage({
      msg: 'chart',
      data: {
        skills: skills1,
        course,
        racedef: params,
        uma,
        pacer: pacer,
        options: {
          seed,
          posKeepMode: PosKeepMode.Approximate,
          allowRushedUma1: false,
          allowRushedUma2: false,
          allowDownhillUma1: false,
          allowDownhillUma2: false,
          allowSectionModifierUma1: false,
          allowSectionModifierUma2: false,
          useEnhancedSpurt: false,
          accuracyMode: false,
          skillCheckChanceUma1: false,
          skillCheckChanceUma2: false,
          pacemakerCount: 1,
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
          seed,
          posKeepMode: PosKeepMode.Approximate,
          allowRushedUma1: false,
          allowRushedUma2: false,
          allowDownhillUma1: false,
          allowDownhillUma2: false,
          allowSectionModifierUma1: false,
          allowSectionModifierUma2: false,
          useEnhancedSpurt: false,
          accuracyMode: false,
          skillCheckChanceUma1: false,
          skillCheckChanceUma2: false,
          pacemakerCount: 1,
        },
      },
    });
  }

  const handleRunCompare = () => {
    window.dispatchEvent(new CustomEvent('doComparison', {}));

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
    window.dispatchEvent(new CustomEvent('doRunOnce', {}));
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

  return { handleRunCompare, handleRunOnce, doBasinnChart };
}
