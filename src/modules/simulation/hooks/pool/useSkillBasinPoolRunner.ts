import { getBaseSkillsToTest } from '@/modules/skills/utils';
import { useRunner, useRunnersStore } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { setIsSimulationRunning } from '@simulation/stores/skill-basin.store';
import { racedefToParams } from '@/utils/races';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { useEffect, useMemo, useRef } from 'react';
import {
  defaultSimulationOptions,
  getActivateableSkills,
  getNullRow,
} from '@/components/bassin-chart/utils';
import {
  appendResultsToTable,
  resetTable,
  setMetrics,
  setTable,
} from '@simulation/stores/skill-basin.store';
import { SkillBasinResponse } from '@simulation/types';
import { PoolManager } from '@/workers/pool/pool-manager';
import SkillBasinPoolWorker from '@/workers/pool/skill-basin/skill-basin.pool.worker.ts?worker';

const baseSkillsToTest = getBaseSkillsToTest();

export function useSkillBasinPoolRunner() {
  const { pacer } = useRunnersStore();
  const { runner } = useRunner();
  const { racedef, seed, courseId } = useSettingsStore();

  const poolManagerRef = useRef<PoolManager | null>(null);

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  // Initialize pool manager on mount
  useEffect(() => {
    const poolManager = new PoolManager(
      (options) => new SkillBasinPoolWorker(options),
    );

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
          (!skillId.startsWith('9') ||
            !runner.skills.includes('1' + skillId.slice(1))),
      ),
      runner,
      course,
      params,
    );

    const uma = runner;

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
          const activeSkills = Array.from(results.values()).filter(
            (r) => !r.filterReason,
          );
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
