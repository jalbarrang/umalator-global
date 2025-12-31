/**
 * Web Worker for Skill Planner optimization
 * Runs simulations for skill combinations and finds the optimal purchase set
 */

import type { CourseData } from '@/modules/simulation/lib/course/definitions';
import type { RaceParameters } from '@/modules/simulation/lib/definitions';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { SimulationOptions } from '@/modules/simulation/types';
import type { CandidateSkill, CombinationResult, OptimizationResult } from '@/modules/skill-planner/types';
import { runComparison } from '@/utils/compare';
import { generateValidCombinations } from '@/modules/skill-planner/optimizer';

type OptimizeParams = {
  candidates: Array<CandidateSkill>;
  budget: number;
  course: CourseData;
  racedef: RaceParameters;
  runner: RunnerState;
  pacer: RunnerState | null;
  options: SimulationOptions;
};

function runOptimization(params: OptimizeParams) {
  const { candidates, budget, course, racedef, runner, pacer, options } = params;
  const startTime = Date.now();

  // Get already-obtained skills (they're part of the runner but don't count toward budget)
  const obtainedSkills = candidates
    .filter((c) => c.isObtained)
    .map((c) => c.skillId);

  // Create a baseline runner with obtained skills
  const baselineRunner: RunnerState = {
    ...runner,
    skills: [...runner.skills, ...obtainedSkills],
  };

  // Generate all valid combinations
  const combinations: Array<Array<string>> = [];
  const generator = generateValidCombinations(candidates, budget, 10);

  for (const combo of generator) {
    combinations.push(combo);
    // Limit to prevent excessive computation
    if (combinations.length >= 1000) {
      break;
    }
  }

  postMessage({
    type: 'combinations-generated',
    count: combinations.length,
  });

  // Test each combination
  const results: Array<CombinationResult> = [];
  let bestResult: CombinationResult | null = null;

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];

    // Create runner with this combination of skills
    const testRunner: RunnerState = {
      ...baselineRunner,
      skills: [...baselineRunner.skills, ...combo],
    };

    // Run simulation comparison (baseline vs test)
    const simResult = runComparison({
      nsamples: 25, // Quick simulation for optimization
      course,
      racedef,
      runnerA: baselineRunner,
      runnerB: testRunner,
      pacer,
      options: {
        ...options,
        includeRunData: false, // Don't need run data for intermediate results
      },
    });

    // Calculate median bashin gain (positive means testRunner is better)
    const sortedDiff = [...simResult.results].sort((a, b) => a - b);
    const mid = Math.floor(sortedDiff.length / 2);
    const medianBashin =
      sortedDiff.length % 2 === 0
        ? (sortedDiff[mid - 1] + sortedDiff[mid]) / 2
        : sortedDiff[mid];

    // Calculate cost
    const candidateMap = new Map(candidates.map((c) => [c.skillId, c]));
    const cost = combo.reduce((sum, skillId) => {
      const candidate = candidateMap.get(skillId);
      return sum + (candidate && !candidate.isObtained ? candidate.effectiveCost : 0);
    }, 0);

    const result: CombinationResult = {
      skills: combo,
      cost,
      bashin: medianBashin,
    };

    results.push(result);

    // Track best result
    if (!bestResult || result.bashin > bestResult.bashin) {
      bestResult = result;
    }

    // Send progress update every 10 combinations
    if ((i + 1) % 10 === 0 || i === combinations.length - 1) {
      postMessage({
        type: 'progress',
        completed: i + 1,
        total: combinations.length,
        currentBest: bestResult,
      });
    }
  }

  // If we found a best result, run a final high-quality simulation on it
  let finalStats = null;
  let finalRunData = null;

  if (bestResult) {
    const finalRunner: RunnerState = {
      ...baselineRunner,
      skills: [...baselineRunner.skills, ...bestResult.skills],
    };

    const finalSim = runComparison({
      nsamples: 200, // Full simulation for final result
      course,
      racedef,
      runnerA: baselineRunner,
      runnerB: finalRunner,
      pacer,
      options: {
        ...options,
        includeRunData: true,
      },
    });

    const sortedDiff = [...finalSim.results].sort((a, b) => a - b);
    const mid = Math.floor(sortedDiff.length / 2);
    const medianBashin =
      sortedDiff.length % 2 === 0
        ? (sortedDiff[mid - 1] + sortedDiff[mid]) / 2
        : sortedDiff[mid];

    // Calculate all statistics
    const meanBashin = sortedDiff.reduce((a, b) => a + b, 0) / sortedDiff.length;

    finalStats = {
      min: sortedDiff[0],
      max: sortedDiff[sortedDiff.length - 1],
      mean: meanBashin,
      median: medianBashin,
    };

    bestResult.bashin = medianBashin;
    bestResult.runData = finalSim.runData;
    finalRunData = finalSim.runData;
  }

  // Sort all results by bashin (descending)
  results.sort((a, b) => b.bashin - a.bashin);

  const timeTaken = Date.now() - startTime;

  const optimizationResult: OptimizationResult = {
    skillsToBuy: bestResult?.skills || [],
    totalCost: bestResult?.cost || 0,
    bashinStats: finalStats || {
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
    },
    simulationCount: combinations.length,
    timeTaken,
    allResults: results.slice(0, 20), // Keep top 20 results
    runData: finalRunData || undefined,
  };

  postMessage({
    type: 'complete',
    result: optimizationResult,
  });
}

self.addEventListener('message', (e: MessageEvent) => {
  const { msg, data } = e.data;

  switch (msg) {
    case 'optimize':
      try {
        runOptimization(data);
      } catch (error) {
        postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      break;
  }
});

