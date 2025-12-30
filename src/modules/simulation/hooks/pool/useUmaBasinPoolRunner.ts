import { useEffect, useMemo, useRef } from 'react';
import UmaBasinPoolWorker from '@workers/pool/uma-basin/uma-basin.pool.worker.ts?worker';
import type { SkillBasinResponse } from '@/modules/simulation/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import {
  appendResultsToTable,
  resetTable,
  setIsSimulationRunning,
  setMetrics,
  setTable,
} from '@/modules/simulation/stores/uma-basin.store';
import {
  defaultSimulationOptions,
  getActivateableSkills,
  getNullRow,
} from '@/components/bassin-chart/utils';
import { uniqueSkillIds } from '@/modules/skills/utils';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { racedefToParams } from '@/utils/races';
import { PoolManager } from '@/workers/pool/pool-manager';

const createUmaBasinPoolWorker = (options: { name: string }) => new UmaBasinPoolWorker(options);

function removeUniqueSkillsFromRunner(uma: RunnerState): RunnerState {
  const filteredSkills = uma.skills.filter((skillId) => !uniqueSkillIds.includes(skillId));

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
    const poolManager = new PoolManager((options) => createUmaBasinPoolWorker(options));

    poolManagerRef.current = poolManager;

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

    const skills = getActivateableSkills(uniqueSkillIds, runner, course, params);

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
          const activeSkills = Array.from(results.values()).filter((r) => !r.filterReason);
          console.log(
            `Stage ${stage} complete with ${results.size} total skills (${activeSkills.length} active, ${results.size - activeSkills.length} filtered)`,
          );

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
