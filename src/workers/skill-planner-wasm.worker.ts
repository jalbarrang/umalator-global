/**
 * # Skill Planner WASM Web Worker
 *
 * Mirrors `skill-planner.worker.ts` but routes optimization through the
 * Rust/WASM engine (`runAdaptiveOptimizationWasm`). The adaptive-sampling
 * strategy and message protocol are identical; only the evaluation backend
 * differs (batch `runCompare` calls instead of the in-process TS sim).
 */

import '../polyfills';
import type { CandidateSkill } from '@/modules/skill-planner/types';
import type { IRunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import type { SimulationOptions } from '@/modules/simulation/types';
import type { OptimizationResult } from '@/modules/skill-planner/types';
import { initUmaSimWasm } from '@/lib/uma-sim-wasm/loader';
import { runAdaptiveOptimizationWasm } from '@/modules/skill-planner/optimization-engine-wasm';
import { getNetCost } from '@/modules/skill-planner/cost-calculator';

interface OptimizeParams {
  candidates: Record<string, CandidateSkill>;
  obtainedSkills: Array<string>; // Skills already owned (cost=0, always in baseline)
  budget: number;
  hasFastLearner: boolean;
  ignoreStaminaConsumption: boolean;
  staminaDrainOverrides: Record<string, number>;
  runner: IRunnerState;
  course: CourseData;
  racedef: RaceParameters;
  options: SimulationOptions;
}

type SkillPlannerWorkerInMessage = { type: 'optimize'; data: OptimizeParams };
type SkillPlannerWorkerOutMessage =
  | { type: 'skill-planner-progress'; progress: unknown }
  | { type: 'skill-planner-result'; result: OptimizationResult }
  | { type: 'skill-planner-done' }
  | { type: 'skill-planner-error'; error: string };

function sendMessage(message: SkillPlannerWorkerOutMessage): void {
  postMessage(message);
}

async function runOptimization(params: OptimizeParams): Promise<void> {
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
    options
  } = params;

  await initUmaSimWasm();

  const candidateArray = Object.values(candidates)
    .filter((c) => !obtainedSkills.includes(c.skillId))
    .map((candidate) => ({
      ...candidate,
      netCost: getNetCost(candidate, hasFastLearner)
    }));

  const result = await runAdaptiveOptimizationWasm({
    candidates: candidateArray,
    obtainedSkills,
    budget,
    ignoreStaminaConsumption,
    runner,
    course,
    racedef,
    options: {
      ...options,
      staminaDrainOverrides
    },
    onProgress: (progress) => {
      sendMessage({ type: 'skill-planner-progress', progress });
    }
  });

  sendMessage({ type: 'skill-planner-result', result });
  sendMessage({ type: 'skill-planner-done' });
}

self.addEventListener('message', (event: MessageEvent<SkillPlannerWorkerInMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'optimize':
      runOptimization(message.data).catch((error) => {
        sendMessage({
          type: 'skill-planner-error',
          error: error instanceof Error ? error.message : 'Unknown WASM optimization error'
        });
      });
      break;
  }
});
