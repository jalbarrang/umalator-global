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
import type { OptimizationResult } from '@/modules/skill-planner/types';
import type { PlannerWasmContext } from '@/modules/simulation/simulators/wasm-skill-planner';
import { initUmaSimWasm } from '@/lib/uma-sim-wasm/loader';
import { runAdaptiveOptimizationWasm } from '@/modules/skill-planner/optimization-engine-wasm';

interface OptimizeParams {
  /** Candidates with `netCost` precomputed on the main thread. */
  candidates: Array<CandidateSkill>;
  /** Pre-generated on the main thread (needs skill-family data). */
  combinations: Array<Array<string>>;
  obtainedSkills: Array<string>; // Skills already owned (cost=0, always in baseline)
  budget: number;
  // Runner/course/race data pre-resolved on the main thread; the worker never
  // touches the dataset.
  context: PlannerWasmContext;
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
  const { candidates, combinations, obtainedSkills, budget, context } = params;

  await initUmaSimWasm();

  const candidateArray = candidates.filter((c) => !obtainedSkills.includes(c.skillId));

  const result = await runAdaptiveOptimizationWasm({
    candidates: candidateArray,
    combinations,
    obtainedSkills,
    budget,
    context,
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
