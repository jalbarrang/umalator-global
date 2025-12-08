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
import {
  appendResultsToTable,
  resetTable,
  setTable,
} from '@simulation/stores/uma-basin.store';
import { SkillBasinResponse } from '@simulation/types';
import { useEffect, useMemo, useRef } from 'react';

type WorkerMessage<T> = {
  type: 'uma-bassin' | 'uma-bassin-done';
  results: T;
};

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

  const worker1Ref = useRef<Worker | null>(null);
  const worker2Ref = useRef<Worker | null>(null);
  const chartWorkersCompletedRef = useRef(0);

  const handleWorkerMessage = (
    event: MessageEvent<WorkerMessage<SkillBasinResponse>>,
  ) => {
    const { type, results } = event.data;

    console.log('uma-bassin:handleWorkerMessage', {
      type,
      results,
    });

    switch (type) {
      case 'uma-bassin':
        appendResultsToTable(results);
        break;
      case 'uma-bassin-done':
        chartWorkersCompletedRef.current += 1;

        if (chartWorkersCompletedRef.current >= 2) {
          setIsSimulationRunning(false);
          chartWorkersCompletedRef.current = 0;
        }

        break;
    }
  };

  useEffect(() => {
    const webWorker = new Worker(
      new URL('@/workers/uma-basin.worker.ts', import.meta.url),
      { type: 'module' },
    );

    webWorker.addEventListener('message', handleWorkerMessage);
    worker1Ref.current = webWorker;

    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
    };
  }, []);

  useEffect(() => {
    const webWorker = new Worker(
      new URL('@/workers/uma-basin.worker.ts', import.meta.url),
      { type: 'module' },
    );

    webWorker.addEventListener('message', handleWorkerMessage);
    worker2Ref.current = webWorker;

    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
    };
  }, []);

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

    const filler: SkillBasinResponse = new Map();

    skills.forEach((id) => filler.set(id, getNullRow(id)));

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
