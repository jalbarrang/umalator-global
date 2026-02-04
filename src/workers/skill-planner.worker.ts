/**
 * # Skill Planner Web Worker
 *
 * Runs skill combination optimization in a background thread.
 *
 * ## Adaptive Sampling Strategy
 *
 * 1. **Initial Pass** (20 samples): Quick filtering to eliminate poor combinations
 * 2. **Top Candidates** (50 samples): More accurate evaluation of promising combinations
 * 3. **Final Winner** (200 samples): High-accuracy evaluation of best combination
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

import type { CandidateSkill } from '@/modules/skill-planner/types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from '@/modules/simulation/lib/course/definitions';
import type { RaceParameters } from '@/modules/simulation/lib/definitions';
import type { SimulationOptions } from '@/modules/simulation/types';
import { runAdaptiveOptimization } from '@/modules/skill-planner/optimization-engine';

interface OptimizeParams {
  candidates: Record<string, CandidateSkill>;
  obtainedSkills: Array<string>; // Skills already owned (cost=0, always in baseline)
  budget: number;
  runner: RunnerState;
  course: CourseData;
  racedef: RaceParameters;
  options: SimulationOptions;
}

/**
 * Main optimization logic - delegates to optimization engine
 */
function runOptimization(params: OptimizeParams) {
  const { candidates, obtainedSkills, budget, runner, course, racedef, options } = params;

  // Convert candidates Record to Array, excluding obtained skills
  const candidateArray = Object.values(candidates).filter(
    (c) => !obtainedSkills.includes(c.skillId),
  );

  // Run optimization with progress callbacks
  const result = runAdaptiveOptimization({
    candidates: candidateArray,
    obtainedSkills,
    budget,
    runner,
    course,
    racedef,
    options,
    onProgress: (progress) => {
      postMessage({
        type: 'skill-planner-progress',
        progress,
      });
    },
  });

  postMessage({
    type: 'skill-planner-result',
    result,
  });

  postMessage({
    type: 'skill-planner-done',
  });
}

// ============================================================
// Worker Message Handler
// ============================================================

self.addEventListener('message', (e: MessageEvent) => {
  const { msg, data } = e.data;

  switch (msg) {
    case 'optimize':
      try {
        runOptimization(data);
      } catch (error) {
        postMessage({
          type: 'skill-planner-error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      break;
  }
});
