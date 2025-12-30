import type { CandidateSkill } from './types';

/**
 * Generate all valid skill combinations within budget using branch-and-bound
 * Handles stackable skills by allowing duplicates
 */
export function* generateValidCombinations(
  candidates: Array<CandidateSkill>,
  budget: number,
  maxCombinationSize: number = 10,
): Generator<Array<string>> {
  // Filter out already-obtained skills from budget consideration
  // but keep them for reference (they'll be added to all simulations)
  const purchasableCandidates = candidates.filter((c) => !c.isObtained);

  if (purchasableCandidates.length === 0) {
    yield [];
    return;
  }

  // Sort by cost (cheapest first) for better pruning
  const sorted = [...purchasableCandidates].sort((a, b) => a.effectiveCost - b.effectiveCost);

  // Recursive generator for combinations
  function* generate(
    index: number,
    currentCombo: Array<string>,
    currentCost: number,
    usedCounts: Map<string, number>,
  ): Generator<Array<string>> {
    // Yield current combination if it's non-empty
    if (currentCombo.length > 0) {
      yield [...currentCombo];
    }

    // Stop if we've reached max size or checked all skills
    if (currentCombo.length >= maxCombinationSize || index >= sorted.length) {
      return;
    }

    // Try adding each remaining skill
    for (let i = index; i < sorted.length; i++) {
      const candidate = sorted[i];
      const usedCount = usedCounts.get(candidate.skillId) ?? 0;

      // Check if we can add this skill
      const maxUses = candidate.isStackable ? 2 : 1;
      if (usedCount >= maxUses) {
        continue;
      }

      const newCost = currentCost + candidate.effectiveCost;

      // Budget pruning: skip if over budget
      if (newCost > budget) {
        continue;
      }

      // Add skill to combination
      const newUsedCounts = new Map(usedCounts);
      newUsedCounts.set(candidate.skillId, usedCount + 1);

      yield* generate(
        i, // Allow re-using same skill if stackable
        [...currentCombo, candidate.skillId],
        newCost,
        newUsedCounts,
      );
    }
  }

  // Start generation from empty combination
  yield* generate(0, [], 0, new Map());
}

/**
 * Calculate cost of a combination
 */
export function calculateCombinationCost(
  skillIds: Array<string>,
  candidates: Map<string, CandidateSkill>,
): number {
  let total = 0;
  for (const skillId of skillIds) {
    const candidate = candidates.get(skillId);
    if (candidate && !candidate.isObtained) {
      total += candidate.effectiveCost;
    }
  }
  return total;
}

/**
 * Estimate bashin gain for quick filtering (before running full simulation)
 * This is a placeholder - in practice, we'll need to run simulations
 */
export function estimateBashinGain(skills: Array<string>): number {
  // This is just a placeholder heuristic
  // Real implementation will run simulations
  return skills.length * 5; // Rough estimate: 5 bashin per skill on average
}

/**
 * Sort combinations by estimated value for better early results
 */
export function sortCombinationsByEstimatedValue(
  combinations: Array<Array<string>>,
  candidates: Map<string, CandidateSkill>,
): Array<Array<string>> {
  return combinations.sort((a, b) => {
    const costA = calculateCombinationCost(a, candidates);
    const costB = calculateCombinationCost(b, candidates);

    const valueA = estimateBashinGain(a) / (costA || 1);
    const valueB = estimateBashinGain(b) / (costB || 1);

    return valueB - valueA; // Higher value/cost ratio first
  });
}

/**
 * Prune combinations that are clearly suboptimal
 * Returns filtered list of combinations worth simulating
 */
export function pruneObviouslyBadCombinations(
  combinations: Array<Array<string>>,
  maxToKeep: number = 1000,
): Array<Array<string>> {
  // For now, just limit the number of combinations to test
  // In a more sophisticated implementation, we could use heuristics
  // to eliminate clearly bad combinations

  if (combinations.length <= maxToKeep) {
    return combinations;
  }

  // Keep the first maxToKeep combinations (assumes they're already sorted)
  return combinations.slice(0, maxToKeep);
}

