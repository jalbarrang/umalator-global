import { getBaseSkillsToTest } from '@/modules/skills/utils';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { useMemo } from 'react';
import { useSkillBassinWorkers } from './useSkillBassinWorkers';
import {
  getActivateableSkills,
  getNullRow,
} from '@/components/bassin-chart/utils';
import {
  resetTable,
  updateTable,
} from '@simulation/stores/skills-bassin.store';
import { RoundResult } from '@simulation/types';

const baseSkillsToTest = getBaseSkillsToTest();

export function useSkillBassinRunner() {
  const { pacer } = useRunnersStore();
  const { runner } = useRunner();
  const { racedef, seed, courseId } = useSettingsStore();
  const { worker1Ref, worker2Ref, chartWorkersCompletedRef } =
    useSkillBassinWorkers();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const doBasinnChart = () => {
    setIsSimulationRunning(true);

    chartWorkersCompletedRef.current = 0;
    const params = racedefToParams(racedef, runner.strategy);

    const skills = getActivateableSkills(
      baseSkillsToTest.filter(
        (skillId) =>
          !runner.skills.includes(skillId) &&
          (!skillId.startsWith('9') ||
            !runner.skills.includes('1' + skillId.slice(1))),
      ),
      runner,
      course,
      params,
    );

    const uma = runner;

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
  };

  return { doBasinnChart };
}
