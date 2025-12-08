import { getBaseSkillsToTest } from '@/modules/skills/utils';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { useMemo } from 'react';
import { useSkillBassinWorkers } from './useSkillBasinWorkers';
import {
  defaultSimulationOptions,
  getActivateableSkills,
  getNullRow,
} from '@/components/bassin-chart/utils';
import { resetTable, setTable } from '@simulation/stores/skill-basin.store';
import { SkillBasinResponse } from '@simulation/types';

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

    const filler: SkillBasinResponse = {};
    skills.forEach((id) => (filler[id] = getNullRow(id)));

    const skills1 = skills.slice(0, Math.floor(skills.length / 2));
    const skills2 = skills.slice(Math.floor(skills.length / 2));

    resetTable();
    setTable(filler);

    worker1Ref.current?.postMessage({
      msg: 'chart',
      data: {
        skills: skills1,
        course,
        racedef: params,
        uma,
        pacer: pacer,
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
        pacer: pacer,
        options: {
          ...defaultSimulationOptions,
          seed,
        },
      },
    });
  };

  return { doBasinnChart };
}
