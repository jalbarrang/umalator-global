import {
  getActivateableSkills,
  getNullRow,
} from '@/components/bassin-chart/utils';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { getUniqueSkills } from '@/modules/skills/utils';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { resetTable, updateTable } from '@simulation/stores/uma-bassin.store';
import { RoundResult } from '@simulation/types';
import { useMemo } from 'react';
import { useUmaBassinWorkers } from './useUmaBassinWorkers';

function removeUniqueSkillsFromRunner(uma: RunnerState): RunnerState {
  const uniqueSkills = getUniqueSkills();

  const filteredSkills = uma.skills.filter(
    (skillId) => !uniqueSkills.includes(skillId),
  );

  return { ...uma, skills: filteredSkills };
}

export function useUmaBassinRunner() {
  const { pacer } = useRunnersStore();
  const { runner } = useRunner();
  const { racedef, seed, courseId } = useSettingsStore();

  const { worker1Ref, worker2Ref, chartWorkersCompletedRef } =
    useUmaBassinWorkers();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  function doBasinnChart() {
    setIsSimulationRunning(true);

    chartWorkersCompletedRef.current = 0;
    const params = racedefToParams(racedef, runner.strategy);

    const uniqueSkills = getUniqueSkills();
    const skills = getActivateableSkills(uniqueSkills, runner, course, params);

    const umaWithoutUniques = removeUniqueSkillsFromRunner(runner);
    const uma = umaWithoutUniques;

    const filler: Record<string, RoundResult> = {};

    skills.forEach((id) => (filler[id] = getNullRow(id)));

    const skills1 = skills.slice(0, Math.floor(skills.length / 2));
    const skills2 = skills.slice(Math.floor(skills.length / 2));

    resetTable();
    updateTable(filler);

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

  return { doBasinnChart };
}
