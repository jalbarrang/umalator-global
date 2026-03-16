/**
 * # useSkillPlannerOptimizer Hook
 *
 * Manages the skill planner web worker lifecycle and optimization state.
 *
 * ## Responsibilities
 *
 * - Initialize and cleanup worker
 * - Handle worker messages (progress, result, error)
 * - Update skill planner store state
 * - Provide optimization control functions
 */

import { useEffect, useMemo, useRef } from 'react';
import SkillPlannerWorker from '@workers/skill-planner.worker.ts?worker';
import {
  createCandidate,
  createNewSeed,
  setIsOptimizing,
  setProgress,
  setResult,
  useSkillPlannerStore,
} from '../skill-planner.store';
import type { CandidateSkill, OptimizationProgress, OptimizationResult } from '../types';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { racedefToParams } from '@/utils/races';
import { useSettingsStore } from '@/store/settings.store';
import { defaultSimulationOptions } from '@/components/bassin-chart/utils';
import { skillCollection } from '@/modules/data/skills';
import { getBaseTier, getUpgradeTier, getWhiteVersion } from '@/modules/skills/skill-relationships';

const createSkillPlannerWorker = () => new SkillPlannerWorker();

type WorkerMessage =
  | {
      type: 'worker-error';
      error: string;
    }
  | {
      type: 'skill-planner-progress';
      progress: OptimizationProgress;
    }
  | {
      type: 'skill-planner-result';
      result: OptimizationResult;
    }
  | {
      type: 'skill-planner-done';
    }
  | {
      type: 'skill-planner-error';
      error: string;
    };

export function useSkillPlannerOptimizer() {
  const { runner, candidates, budget, obtainedSkills, hasFastLearner, seed } =
    useSkillPlannerStore();
  const { courseId, racedef } = useSettingsStore();

  const webWorkerRef = useRef<Worker | null>(null);

  // Transform course and race parameters
  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);
  const raceParams = useMemo(() => racedefToParams(racedef), [racedef]);

  // Worker message handler
  const handleWorkerMessage = (event: MessageEvent<WorkerMessage>) => {
    const { type } = event.data;

    console.log('skill-planner:handleWorkerMessage', {
      type,
      data: event.data,
    });

    switch (type) {
      case 'skill-planner-progress':
        setProgress(event.data.progress);
        break;
      case 'skill-planner-result':
        setResult(event.data.result);
        break;
      case 'skill-planner-done':
        setIsOptimizing(false);
        setProgress(null);
        break;
      case 'skill-planner-error':
        console.error('Optimization error:', event.data.error);
        setIsOptimizing(false);
        setProgress(null);
        setResult(null);
        break;
      case 'worker-error':
        console.error('Skill planner worker error:', event.data.error);
        setIsOptimizing(false);
        setProgress(null);
        setResult(null);
        break;
    }
  };

  // Initialize worker on mount
  useEffect(() => {
    const webWorker = createSkillPlannerWorker();

    webWorker.addEventListener('message', handleWorkerMessage);

    webWorkerRef.current = webWorker;

    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
      webWorkerRef.current = null;
    };
  }, []);

  const runWithSeed = (seedValue: number) => {
    if (!webWorkerRef.current) {
      console.error('Worker not initialized');
      return;
    }

    setResult(null);
    setProgress(null);
    setIsOptimizing(true);

    const expandedCandidates = expandPrerequisites(candidates, obtainedSkills);

    webWorkerRef.current?.postMessage({
      type: 'optimize',
      data: {
        candidates: expandedCandidates,
        obtainedSkills,
        budget,
        hasFastLearner,
        runner,
        course,
        racedef: raceParams,
        options: {
          ...defaultSimulationOptions,
          seed: seedValue,
        },
      },
    });
  };

  const handleOptimize = () => {
    const newSeed = createNewSeed();
    runWithSeed(newSeed);
  };

  const handleReplay = () => {
    if (seed === null) return;
    runWithSeed(seed);
  };

  // Cancel optimization
  const handleCancel = () => {
    if (!webWorkerRef.current) {
      return;
    }

    // Terminate and recreate worker
    webWorkerRef.current.terminate();

    const newWorker = createSkillPlannerWorker();
    newWorker.addEventListener('message', handleWorkerMessage);
    webWorkerRef.current = newWorker;

    // Reset state
    setIsOptimizing(false);
    setProgress(null);
  };

  return {
    handleOptimize,
    handleReplay,
    handleCancel,
  };
}

/**
 * Expand candidates with their prerequisite tiers (downward only).
 *
 * - Gold → adds white base ○ and upgrade ◎
 * - Upgrade ◎ → adds base ○
 * - Base ○ → no expansion
 *
 * Prerequisites are added with default hint level 0.
 * Already-present candidates and obtained skills are skipped.
 */
function expandPrerequisites(
  candidates: Record<string, CandidateSkill>,
  obtainedSkills: Array<string>,
): Record<string, CandidateSkill> {
  const expanded: Record<string, CandidateSkill> = { ...candidates };
  const obtainedSet = new Set(obtainedSkills);

  for (const candidate of Object.values(candidates)) {
    const skill = skillCollection[candidate.skillId];
    if (!skill) continue;

    if (skill.rarity === 2) {
      // Gold → add white base ○ and upgrade ◎
      const whiteId = getWhiteVersion(candidate.skillId);
      if (!whiteId) continue;

      const baseId = getBaseTier(whiteId);
      const upgradeId = getUpgradeTier(baseId);

      for (const prereqId of [baseId, upgradeId]) {
        if (prereqId && !expanded[prereqId] && !obtainedSet.has(prereqId)) {
          expanded[prereqId] = createCandidate({ skillId: prereqId });
        }
      }
    } else if (candidate.isStackable && candidate.tierLevel === 2 && candidate.previousTierId) {
      // Upgrade ◎ → add base ○
      const baseId = candidate.previousTierId;
      if (!expanded[baseId] && !obtainedSet.has(baseId)) {
        expanded[baseId] = createCandidate({ skillId: baseId });
      }
    }
  }

  return expanded;
}
