/**
 * Skill Planner Optimization Engine (WASM)
 *
 * Async mirror of `optimization-engine.ts` that routes each combination
 * evaluation through the Rust/WASM `runCompare` batch call
 * (`wasm-skill-planner.ts`) instead of the in-process TS engine.
 *
 * Throughput optimization: the baseline vacuum (obtained skills only) is
 * identical across every candidate combination within a run, so it is computed
 * once per sample-count and cached. This halves the sim work in the dominant
 * stage-1 pass relative to the TS engine, which re-runs the baseline for every
 * combination.
 */

import { calculateCombinationCost } from './combination-cost';
import {
  computePlannerStats,
  runPlannerVacuumWasm,
  type PlannerWasmContext
} from '@/modules/simulation/simulators/wasm-skill-planner';
import type {
  CandidateSkill,
  CombinationResult,
  OptimizationProgress,
  OptimizationResult
} from './types';
import type { WasmCompareData } from '@/lib/uma-sim-wasm/types';

/**
 * WASM-path optimizer inputs. Unlike the TS `OptimizationParams`, the runner /
 * course / race data are pre-resolved into a data-free {@link PlannerWasmContext}
 * on the main thread, and candidates already carry their `netCost`.
 */
export interface OptimizationWasmParams {
  candidates: Array<CandidateSkill>;
  /** Pre-generated on the main thread (combination generation needs skill-family data). */
  combinations: Array<Array<string>>;
  obtainedSkills: Array<string>;
  budget: number;
  context: PlannerWasmContext;
  onProgress?: (progress: OptimizationProgress) => void;
}

interface EvaluationResult {
  skills: Array<string>;
  cost: number;
  skillCosts: Record<string, number>;
  bashin: number;
  min: number;
  max: number;
  median: number;
}

/**
 * Async mirror of `runAdaptiveOptimization` (three-stage adaptive sampling)
 * backed by the WASM engine.
 */
export async function runAdaptiveOptimizationWasm(
  params: OptimizationWasmParams
): Promise<OptimizationResult> {
  const { candidates, combinations, obtainedSkills, context, onProgress } = params;

  const startTime = performance.now();

  if (combinations.length === 0) {
    throw new Error('No valid skill combinations found within budget');
  }

  // Baseline vacuum (obtained skills only) is constant across combinations for
  // a given sample-count — compute lazily and cache per sample-count.
  const baselineCache = new Map<number, WasmCompareData>();
  const getBaseline = async (samples: number): Promise<WasmCompareData> => {
    const cached = baselineCache.get(samples);
    if (cached) {
      return cached;
    }
    const baseline = await runPlannerVacuumWasm(context, obtainedSkills, samples);
    baselineCache.set(samples, baseline);
    return baseline;
  };

  const candidateMap = new Map(candidates.map((candidate) => [candidate.skillId, candidate]));

  const evaluateCombination = async (
    combination: Array<string>,
    samples: number
  ): Promise<EvaluationResult> => {
    const baseline = await getBaseline(samples);
    const candidateVacuum = await runPlannerVacuumWasm(
      context,
      [...obtainedSkills, ...combination],
      samples
    );

    const stats = computePlannerStats(baseline, candidateVacuum, samples);

    const skillCosts: Record<string, number> = {};
    for (const skillId of combination) {
      skillCosts[skillId] = candidateMap.get(skillId)?.netCost ?? 0;
    }

    return {
      skills: combination,
      cost: calculateCombinationCost(combination, candidates),
      skillCosts,
      bashin: stats.mean,
      min: stats.min,
      max: stats.max,
      median: stats.median
    };
  };

  const evaluateCombinations = async (
    combos: Array<Array<string>>,
    samples: number,
    progressOffset: number,
    progressTotal: number
  ): Promise<Array<CombinationResult>> => {
    const results: Array<CombinationResult> = [];

    for (let i = 0; i < combos.length; i++) {
      const result = await evaluateCombination(combos[i], samples);
      results.push(result);

      if (onProgress && (i % 5 === 0 || i === combos.length - 1)) {
        const currentBest = results.toSorted((a, b) => b.bashin - a.bashin)[0];
        onProgress({
          completed: progressOffset + i + 1,
          total: progressTotal,
          currentBest: currentBest ?? null
        });
      }
    }

    return results;
  };

  // Stage 1: Initial Pass (15 samples per combination)
  const stage1Results = await evaluateCombinations(combinations, 15, 0, combinations.length);

  // Stage 2: Top Candidates (35 samples)
  stage1Results.sort((a, b) => b.bashin - a.bashin);
  const topCount = Math.max(5, Math.ceil(stage1Results.length * 0.2));
  const topCombinations = stage1Results.slice(0, topCount).map((c) => c.skills);

  const stage2Results = await evaluateCombinations(
    topCombinations,
    35,
    combinations.length,
    combinations.length + topCombinations.length + 1
  );

  // Stage 3: Final Winner (120 samples)
  stage2Results.sort((a, b) => b.bashin - a.bashin);
  const winner = stage2Results[0];
  if (!winner) {
    throw new Error('No optimal combination found');
  }

  const finalResult = await evaluateCombination(winner.skills, 120);

  const endTime = performance.now();

  // Merge stage 2 (accurate) results with remaining stage 1 results.
  const stage2SkillKeys = new Set(stage2Results.map((r) => r.skills.join(',')));
  const remainingStage1 = stage1Results.filter((r) => !stage2SkillKeys.has(r.skills.join(',')));
  const allResults = [...stage2Results, ...remainingStage1];

  return {
    skillsToBuy: winner.skills,
    totalCost: winner.cost,
    bashinStats: {
      min: finalResult.min,
      max: finalResult.max,
      mean: finalResult.bashin,
      median: finalResult.median
    },
    simulationCount: combinations.length + topCombinations.length + 1,
    timeTaken: endTime - startTime,
    allResults
  };
}
