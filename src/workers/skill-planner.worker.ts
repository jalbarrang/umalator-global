/**
 * # Skill Planner Web Worker
 *
 * Runs skill combination optimization in a background thread.
 *
 * ## Adaptive Sampling Strategy
 *
 * 1. **Initial Pass** (15 samples): Quick filtering to eliminate poor combinations
 * 2. **Top Candidates** (35 samples): More accurate evaluation of promising combinations
 * 3. **Final Winner** (120 samples): High-accuracy evaluation of best combination
 *
 * ## Message Protocol
 *
 * **Input:**
 * - `msg: 'optimize'` - Start optimization
 * - `msg: 'cancel'` - Abort optimization (handled via termination)
 *
 * **Output:**
 * - `type: 'skill-planner-progress'` - Progress update
 * - `type: 'skill-planner-result'` - Final optimization result
 * - `type: 'skill-planner-done'` - Optimization complete
 * - `type: 'skill-planner-error'` - Error occurred
 */

import '../polyfills';
import type { CandidateSkill } from '@/modules/skill-planner/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import type { SimulationOptions } from '@/modules/simulation/types';
import { runAdaptiveOptimization } from '@/modules/skill-planner/optimization-engine';
import { getNetCost } from '@/modules/skill-planner/cost-calculator';

interface OptimizeParams {
  candidates: Record<string, CandidateSkill>;
  obtainedSkills: Array<string>; // Skills already owned (cost=0, always in baseline)
  budget: number;
  hasFastLearner: boolean;
  ignoreStaminaConsumption: boolean;
  staminaDrainOverrides: Record<string, number>;
  runner: RunnerState;
  course: CourseData;
  racedef: RaceParameters;
  options: SimulationOptions;
}

type SkillPlannerWorkerInMessage = { type: 'optimize'; data: OptimizeParams };
type SkillPlannerWorkerOutMessage =
  | { type: 'skill-planner-progress'; progress: unknown }
  | { type: 'skill-planner-result'; result: ReturnType<typeof runAdaptiveOptimization> }
  | { type: 'skill-planner-done' }
  | { type: 'skill-planner-error'; error: string };

function sendMessage(message: SkillPlannerWorkerOutMessage): void {
  postMessage(message);
}

/**
 * Main optimization logic - delegates to optimization engine
 */
function runOptimization(params: OptimizeParams) {
  const {
    candidates,
    obtainedSkills,
    budget,
    hasFastLearner,
    ignoreStaminaConsumption,
    staminaDrainOverrides,
    runner,
    course,
    racedef,
    options,
  } = params;

  // Convert candidates Record to Array, excluding obtained skills
  const candidateArray = Object.values(candidates)
    .filter((c) => !obtainedSkills.includes(c.skillId))
    .map((candidate) => ({
      ...candidate,
      netCost: getNetCost(candidate, hasFastLearner),
    }));

  // Run optimization with progress callbacks
  const result = runAdaptiveOptimization({
    candidates: candidateArray,
    obtainedSkills,
    budget,
    ignoreStaminaConsumption,
    runner,
    course,
    racedef,
    options: {
      ...options,
      staminaDrainOverrides,
    },
    onProgress: (progress) => {
      sendMessage({
        type: 'skill-planner-progress',
        progress,
      });
    },
  });

  sendMessage({
    type: 'skill-planner-result',
    result,
  });

  sendMessage({
    type: 'skill-planner-done',
  });
}

// ============================================================
// Worker Message Handler
// ============================================================

self.addEventListener('message', (event: MessageEvent<SkillPlannerWorkerInMessage>) => {
  const message = event.data;

  try {
    switch (message.type) {
      case 'optimize':
        runOptimization(message.data);
        break;
    }
  } catch (error) {
    sendMessage({
      type: 'skill-planner-error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
