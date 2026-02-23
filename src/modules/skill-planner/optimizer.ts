/**
 * Skill Optimizer
 *
 * Finds optimal skill combinations within budget constraints.
 *
 * Strategy:
 * 1. Start with obtained skills (baseline, cost=0)
 * 2. Generate combinations from candidate pool
 * 3. Resolve conflicts (gold > white, ◎ > ○)
 * 4. Simulate each combination
 * 5. Rank by performance
 *
 * Uses racer-sim's BatchSimulator for efficient simulation.
 */

import type { RunnerState } from '../runners/components/runner-card/types';
import type { CandidateSkill, CombinationResult } from './types';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import { getGoldVersion, getUpgradeTier } from '@/modules/skills/skill-relationships';

/**
 * Input parameters for skill optimization
 */
export interface OptimizerInput {
  /** Skills already owned from career (cost = 0, always included) */
  obtainedSkills: Array<string>;
  /** Candidate skills available to purchase */
  candidates: Array<CandidateSkill>;
  /** Available skill points budget */
  budget: number;
  /** Runner configuration for simulation */
  runnerConfig: RunnerState;
  /** Course data */
  course: CourseData;
  /** Race parameters */
  raceParameters: RaceParameters;
  /** Number of simulation runs per combination */
  nsamples?: number;
  /** Callback for progress updates */
  onProgress?: (completed: number, total: number, currentBest: CombinationResult | null) => void;
}

/**
 * Resolve active skills by filtering out superseded skills
 *
 * Resolution rules:
 * 1. Gold supersedes white (same family)
 * 2. Upgrade tier (◎) supersedes base tier (○)
 *
 * @param skillIds List of skill IDs (obtained + candidates)
 * @returns Filtered list with only active skills
 */
export function resolveActiveSkills(skillIds: Array<string>): Array<string> {
  const resolved = new Set(skillIds);

  for (const skillId of skillIds) {
    // Check if there's a gold version in the list
    const goldVersion = getGoldVersion(skillId);
    if (goldVersion && resolved.has(goldVersion)) {
      // Remove white version (gold supersedes)
      resolved.delete(skillId);
      continue;
    }

    // Check if there's an upgrade tier in the list
    const upgradeTier = getUpgradeTier(skillId);
    if (upgradeTier && resolved.has(upgradeTier)) {
      // Remove base tier (upgrade supersedes)
      resolved.delete(skillId);
      continue;
    }
  }

  return Array.from(resolved);
}

/**
 * Generate skill combinations within budget using greedy approach
 *
 * Strategy:
 * 1. Test each skill individually (baseline)
 * 2. Test pairs of high-impact skills
 * 3. Test larger combinations prioritizing high performers
 *
 * @param candidates Available candidate skills
 * @param budget Maximum cost allowed
 * @returns List of skill ID combinations to test
 */
export function generateCombinations(
  candidates: Array<CandidateSkill>,
  budget: number,
): Array<Array<string>> {
  const combinations: Array<Array<string>> = [];

  // Always test baseline (no additional skills)
  combinations.push([]);

  // Sort candidates by display cost (cheapest first for better coverage)
  const sortedCandidates = candidates.toSorted((a, b) => a.cost - b.cost);

  // Test individual skills
  for (const candidate of sortedCandidates) {
    const cost = candidate.cost;
    if (cost <= budget) {
      combinations.push([candidate.skillId]);
    }
  }

  // Test pairs (limited to avoid combinatorial explosion)
  for (let i = 0; i < Math.min(sortedCandidates.length, 10); i++) {
    for (let j = i + 1; j < Math.min(sortedCandidates.length, 10); j++) {
      const costI = sortedCandidates[i].cost;
      const costJ = sortedCandidates[j].cost;
      const cost = costI + costJ;

      if (cost <= budget) {
        combinations.push([sortedCandidates[i].skillId, sortedCandidates[j].skillId]);
      }
    }
  }

  // Test triples (even more limited)
  for (let i = 0; i < Math.min(sortedCandidates.length, 5); i++) {
    for (let j = i + 1; j < Math.min(sortedCandidates.length, 5); j++) {
      for (let k = j + 1; k < Math.min(sortedCandidates.length, 5); k++) {
        const costI = sortedCandidates[i].cost;
        const costJ = sortedCandidates[j].cost;
        const costK = sortedCandidates[k].cost;
        const cost = costI + costJ + costK;

        if (cost <= budget) {
          combinations.push([
            sortedCandidates[i].skillId,
            sortedCandidates[j].skillId,
            sortedCandidates[k].skillId,
          ]);
        }
      }
    }
  }

  return combinations;
}

/**
 * Calculate total cost of a skill combination
 */
export function calculateCombinationCost(
  skillIds: Array<string>,
  candidates: Array<CandidateSkill>,
): number {
  const candidateMap = new Map(candidates.map((c) => [c.skillId, c]));
  let total = 0;

  for (const skillId of skillIds) {
    const candidate = candidateMap.get(skillId);

    if (candidate) {
      total += candidate.cost;
    }
  }

  return total;
}
