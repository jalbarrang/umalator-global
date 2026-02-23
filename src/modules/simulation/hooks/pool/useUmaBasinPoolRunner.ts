import { useEffect, useMemo, useRef } from 'react';
import UmaBasinPoolWorker from '@workers/pool/uma-basin/uma-basin.pool.worker.ts?worker';
import type { SkillComparisonResponse } from '@/modules/simulation/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import {
  appendResultsToTable,
  resetTable,
  setIsSimulationRunning,
  setMetrics,
  setProgress,
  setTable,
} from '@/modules/simulation/stores/uma-basin.store';
import {
  defaultSimulationOptions,
  getActivateableSkills,
  getNullSkillComparisonRow,
} from '@/components/bassin-chart/utils';
import { uniqueSkillIds } from '@/modules/skills/utils';
import { useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { racedefToParams } from '@/utils/races';
import { PoolManager } from '@/workers/pool/pool-manager';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';

const createUmaBasinPoolWorker = (options: { name: string }) => new UmaBasinPoolWorker(options);

function removeUniqueSkillsFromRunner(uma: RunnerState): RunnerState {
  const filteredSkills = uma.skills.filter((skillId) => !uniqueSkillIds.includes(skillId));

  return { ...uma, skills: filteredSkills };
}

export function useUmaBasinPoolRunner() {
  const { runner } = useRunner();
  const { racedef, courseId } = useSettingsStore();

  const poolManagerRef = useRef<PoolManager | null>(null);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  // Initialize pool manager on mount
  useEffect(() => {
    const poolManager = new PoolManager((options) => createUmaBasinPoolWorker(options));

    poolManagerRef.current = poolManager;

    return () => {
      poolManagerRef.current?.terminateWorkers();
    };
  }, []);

  const doBasinnChart = (seed?: number) => {
    if (!poolManagerRef.current) {
      console.error('Pool manager not initialized');
      return;
    }

    setIsSimulationRunning(true);

    const params = racedefToParams(racedef, runner.strategy);

    const skills = getActivateableSkills(uniqueSkillIds, runner, course, params);

    const umaWithoutUniques = removeUniqueSkillsFromRunner(runner);
    const uma = umaWithoutUniques;

    // Create placeholder results
    const filler: SkillComparisonResponse = {};
    skills.forEach((id) => (filler[id] = getNullSkillComparisonRow(id)));

    resetTable();
    setTable(filler);

    // Generate random seed if not provided
    const simulationSeed = seed ?? Math.floor(Math.random() * 1000000);

    // Run simulation using pool manager
    poolManagerRef.current.run(
      skills,
      {
        course,
        racedef: params,
        uma,
        options: {
          ...defaultSimulationOptions,
          seed: simulationSeed,
        },
      },
      {
        onProgress: (results, progress) => {
          appendResultsToTable(results);
          setProgress(progress);
        },
        onStageComplete: (stage, results, progress) => {
          appendResultsToTable(results);
          setProgress(progress);
        },
        onComplete: (results, metrics) => {
          appendResultsToTable(results);
          setMetrics(metrics);
          setProgress(null);
          setIsSimulationRunning(false);
        },
        onError: (error) => {
          console.error('Pool simulation error:', error);
          setProgress(null);
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
