import { useEffect, useMemo, useRef } from 'react';
import SkillBasinPoolWorker from '@workers/pool/skill-basin/skill-basin.pool.worker.ts?worker';
import type { SkillComparisonResponse } from '../../types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import {
  appendResultsToTable,
  resetTable,
  setIsSimulationRunning,
  setMetrics,
  setTable,
} from '@/modules/simulation/stores/skill-basin.store';
import { getBaseSkillsToTest } from '@/modules/skills/utils';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { racedefToParams } from '@/utils/races';
import {
  defaultSimulationOptions,
  getActivateableSkills,
  getNullSkillComparisonRow,
} from '@/components/bassin-chart/utils';
import { PoolManager } from '@/workers/pool/pool-manager';

const createSkillBasinPoolWorker = (options: { name: string }) => new SkillBasinPoolWorker(options);

const baseSkillsToTest = getBaseSkillsToTest();

export function useSkillBasinPoolRunner() {
  const { pacer } = useRunnersStore();
  const { runner } = useRunner();
  const { racedef, seed, courseId } = useSettingsStore();

  const poolManagerRef = useRef<PoolManager | null>(null);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  // Initialize pool manager on mount
  useEffect(() => {
    const poolManager = new PoolManager((options) => createSkillBasinPoolWorker(options));

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

    const skills = getActivateableSkills(
      baseSkillsToTest.filter(
        (skillId) =>
          !runner.skills.includes(skillId) &&
          (!skillId.startsWith('9') || !runner.skills.includes('1' + skillId.slice(1))),
      ),
      runner,
      course,
      params,
    );

    const uma = runner;

    // Create placeholder results
    const filler: SkillComparisonResponse = {};
    skills.forEach((id) => (filler[id] = getNullSkillComparisonRow(id)));

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
          const activeSkills = Object.values(results).filter((r) => !r.filterReason);
          console.log(
            `Stage ${stage} complete with ${Object.keys(results).length} total skills (${activeSkills.length} active, ${Object.keys(results).length - activeSkills.length} filtered)`,
          );
          appendResultsToTable(results);
        },
        onComplete: (results, metrics) => {
          appendResultsToTable(results);
          setMetrics(metrics);
          setIsSimulationRunning(false);

          console.log('Skill basin pool simulation complete', results, metrics);
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
