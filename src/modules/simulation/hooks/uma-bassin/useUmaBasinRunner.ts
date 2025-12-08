import {
  defaultSimulationOptions,
  getActivateableSkills,
  getNullRow,
} from '@/components/bassin-chart/utils';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { uniqueSkillIds } from '@/modules/skills/utils';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { resetTable, setTable } from '@simulation/stores/uma-basin.store';
import { SkillBasinResponse } from '@simulation/types';
import { useMemo } from 'react';
import { useUmaBassinWorkers } from './useUmaBasinWorkers';

function removeUniqueSkillsFromRunner(uma: RunnerState): RunnerState {
  const filteredSkills = uma.skills.filter(
    (skillId) => !uniqueSkillIds.includes(skillId),
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

    const skills = getActivateableSkills(
      uniqueSkillIds,
      runner,
      course,
      params,
    );

    const umaWithoutUniques = removeUniqueSkillsFromRunner(runner);
    const uma = umaWithoutUniques;

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
  }

  return { doBasinnChart };
}
