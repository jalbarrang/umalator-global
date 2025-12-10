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
  setMetrics,
  setTable,
} from '@simulation/stores/uma-basin.store';
import { SkillBasinResponse } from '@simulation/types';
import { useEffect, useMemo, useRef } from 'react';
import { PoolManager } from '@/workers/pool/pool-manager';

function removeUniqueSkillsFromRunner(uma: RunnerState): RunnerState {
  const filteredSkills = uma.skills.filter(
    (skillId) => !uniqueSkillIds.includes(skillId),
  );

  return { ...uma, skills: filteredSkills };
}

export function useUmaBasinPoolRunner() {
  const { pacer } = useRunnersStore();
  const { runner } = useRunner();
  const { racedef, seed, courseId } = useSettingsStore();

  const poolManagerRef = useRef<PoolManager | null>(null);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  // Initialize pool manager on mount
  useEffect(() => {
    const workerUrl = new URL(
      '@/workers/pool/uma-basin/uma-basin.pool.worker.ts',
      import.meta.url,
    );

    poolManagerRef.current = new PoolManager(workerUrl);

    return () => {
      poolManagerRef.current?.terminateWorkers();
    };
  }, []);

  const doBasinnChart = () => {
    if (!poolManagerRef.current) {
      console.error('Pool manager not initialized');
      return;
    }

    setIsSimulationRunning(true);

    const params = racedefToParams(racedef, runner.strategy);

    const skills = getActivateableSkills(
      uniqueSkillIds,
      runner,
      course,
      params,
    );

    const umaWithoutUniques = removeUniqueSkillsFromRunner(runner);
    const uma = umaWithoutUniques;

    // Create placeholder results
    const filler: SkillBasinResponse = new Map();
    skills.forEach((id) => filler.set(id, getNullRow(id)));

    resetTable();
    setTable(filler);

    // Run simulation using pool manager
    poolManagerRef.current.run(
      skills,
      {
        course,
        racedef: params,
        uma,
        pacer: pacer,
        options: {
          ...defaultSimulationOptions,
          seed,
        },
      },
      {
        onProgress: (results) => {
          appendResultsToTable(results);
        },
        onStageComplete: (stage, results) => {
          console.log(`Stage ${stage} complete with ${results.size} skills`);
          appendResultsToTable(results);
        },
        onComplete: (results, metrics) => {
          appendResultsToTable(results);
          setMetrics(metrics);
          setIsSimulationRunning(false);
        },
        onError: (error) => {
          console.error('Pool simulation error:', error);
          setIsSimulationRunning(false);
        },
      },
    );
  };

  const cancelSimulation = () => {
    poolManagerRef.current?.terminateWorkers();
    setIsSimulationRunning(false);
  };

  return { doBasinnChart, cancelSimulation };
}
