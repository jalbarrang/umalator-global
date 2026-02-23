/**
 * Skill Planner Optimization Engine
 *
 * Core optimization logic extracted for testing and reusability.
 * Uses adaptive sampling strategy to find optimal skill combinations.
 */

import { runSkillCombinationComparison } from './simulator';
import { calculateCombinationCost, generateCombinations } from './optimizer';
import type {
  CandidateSkill,
  CombinationResult,
  OptimizationProgress,
  OptimizationResult,
} from './types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import type { SimulationOptions } from '@/modules/simulation/types';

export interface OptimizationParams {
  /** Candidate skills available to purchase */
  candidates: Array<CandidateSkill>;
  /** Skills already owned (cost=0, always in baseline) */
  obtainedSkills: Array<string>;
  /** Available skill points budget */
  budget: number;
  /** Runner configuration (without skills - they'll be set during simulation) */
  runner: RunnerState;
  /** Course data */
  course: CourseData;
  /** Race parameters */
  racedef: RaceParameters;
  /** Simulation options */
  options: SimulationOptions;
  /** Callback for progress updates */
  onProgress?: (progress: OptimizationProgress) => void;
}

export interface OptimizationStageConfig {
  /** Number of samples for this stage */
  samples: number;
  /** Stage name for logging */
  name: string;
}

/**
 * Runs optimization with adaptive sampling across three stages:
 * 1. Initial Pass: Quick evaluation of all combinations (low samples)
 * 2. Top Candidates: More accurate evaluation of promising combinations (medium samples)
 * 3. Final Winner: High-accuracy evaluation of best combination (high samples)
 */
export function runAdaptiveOptimization(params: OptimizationParams): OptimizationResult {
  const { candidates, obtainedSkills, budget, runner, course, racedef, options, onProgress } =
    params;

  const startTime = performance.now();

  // Generate combinations to test
  const combinations = generateCombinations(candidates, budget);

  if (combinations.length === 0) {
    throw new Error('No valid skill combinations found within budget');
  }

  // ============================================================
  // Stage 1: Initial Pass (20 samples per combination)
  // ============================================================

  const stage1Results = evaluateCombinations({
    combinations,
    candidates,
    obtainedSkills,
    runner,
    course,
    racedef,
    options,
    samples: 20,
    progressOffset: 0,
    progressTotal: combinations.length,
    onProgress,
  });

  // ============================================================
  // Stage 2: Top Candidates (50 samples)
  // ============================================================

  // Sort by bashin gain and take top 20%
  stage1Results.sort((a, b) => b.bashin - a.bashin);
  const topCount = Math.max(5, Math.ceil(stage1Results.length * 0.2));
  const topCandidates = stage1Results.slice(0, topCount);

  const topCombinations = topCandidates.map((c) => c.skills);

  const stage2Results = evaluateCombinations({
    combinations: topCombinations,
    candidates,
    obtainedSkills,
    runner,
    course,
    racedef,
    options,
    samples: 50,
    progressOffset: combinations.length,
    progressTotal: combinations.length + topCombinations.length + 1,
    onProgress,
  });

  // ============================================================
  // Stage 3: Final Winner (200 samples)
  // ============================================================

  stage2Results.sort((a, b) => b.bashin - a.bashin);
  const winner = stage2Results[0];

  if (!winner) {
    throw new Error('No optimal combination found');
  }

  // Run final simulation with high sample count for accuracy
  const finalResult = evaluateCombination({
    combination: winner.skills,
    candidates,
    obtainedSkills,
    runner,
    course,
    racedef,
    options,
    samples: 200,
  });

  const endTime = performance.now();
  const timeTaken = endTime - startTime;

  // Build final optimization result
  const optimizationResult: OptimizationResult = {
    skillsToBuy: winner.skills,
    totalCost: winner.cost,
    bashinStats: {
      min: finalResult.min,
      max: finalResult.max,
      mean: finalResult.bashin, // evaluateCombination returns 'bashin', not 'mean'
      median: finalResult.median,
    },
    simulationCount: combinations.length + topCombinations.length + 1,
    timeTaken,
    allResults: stage2Results,
  };

  return optimizationResult;
}

interface EvaluateCombinationsParams {
  combinations: Array<Array<string>>;
  candidates: Array<CandidateSkill>;
  obtainedSkills: Array<string>;
  runner: RunnerState;
  course: CourseData;
  racedef: RaceParameters;
  options: SimulationOptions;
  samples: number;
  progressOffset: number;
  progressTotal: number;
  onProgress?: (progress: OptimizationProgress) => void;
}

/**
 * Evaluates multiple skill combinations with the specified sample count
 */
function evaluateCombinations(params: EvaluateCombinationsParams): Array<CombinationResult> {
  const {
    combinations,
    candidates,
    obtainedSkills,
    runner,
    course,
    racedef,
    options,
    samples,
    progressOffset,
    progressTotal,
    onProgress,
  } = params;

  const results: Array<CombinationResult> = [];

  for (let i = 0; i < combinations.length; i++) {
    const combination = combinations[i];

    const result = evaluateCombination({
      combination,
      candidates,
      obtainedSkills,
      runner,
      course,
      racedef,
      options,
      samples,
    });

    results.push(result);

    // Post progress update every 5 combinations
    if (onProgress && (i % 5 === 0 || i === combinations.length - 1)) {
      const currentBest = results.toSorted((a, b) => b.bashin - a.bashin)[0];

      onProgress({
        completed: progressOffset + i + 1,
        total: progressTotal,
        currentBest: currentBest ?? null,
      });
    }
  }

  return results;
}

interface EvaluateCombinationParams {
  combination: Array<string>;
  candidates: Array<CandidateSkill>;
  obtainedSkills: Array<string>;
  runner: RunnerState;
  course: CourseData;
  racedef: RaceParameters;
  options: SimulationOptions;
  samples: number;
}

interface EvaluationResult {
  skills: Array<string>;
  cost: number;
  bashin: number;
  min: number;
  max: number;
  median: number;
}

/**
 * Evaluates a single skill combination
 *
 * CRITICAL: The simulator compares:
 * - Base runner: obtainedSkills only
 * - Test runner: obtainedSkills + combination
 *
 * Therefore, baseRunner.skills should ONLY contain obtainedSkills,
 * and candidateSkills should contain the combination to test.
 */
function evaluateCombination(params: EvaluateCombinationParams): EvaluationResult {
  const { combination, candidates, obtainedSkills, runner, course, racedef, options, samples } =
    params;

  // Create base runner with ONLY obtained skills
  // The simulator will create the test runner by adding candidateSkills
  const baseRunner = { ...runner, skills: obtainedSkills };

  // Run simulation comparing:
  // - Base: obtainedSkills
  // - Test: obtainedSkills + combination
  const result = runSkillCombinationComparison({
    nsamples: samples,
    course,
    racedef,
    baseRunner,
    candidateSkills: combination, // Additional skills to test
    options,
  });

  return {
    skills: combination,
    cost: calculateCombinationCost(combination, candidates),
    bashin: result.mean,
    min: result.min,
    max: result.max,
    median: result.median,
  };
}
