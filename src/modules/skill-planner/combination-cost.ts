// Data-free combination cost helper. Lives apart from `optimizer.ts` (which
// imports `skill-relationships` and thus the skill dataset) so the optimizer
// worker can sum combination costs without pulling the dataset into its bundle.

import type { CandidateSkill } from './types';

/** Sum the net (discounted) costs of the skills in a combination. */
export function calculateCombinationCost(
  skillIds: Array<string>,
  candidates: Array<CandidateSkill>
): number {
  const candidateMap = new Map(candidates.map((c) => [c.skillId, c]));
  let total = 0;

  for (const skillId of skillIds) {
    const candidate = candidateMap.get(skillId);

    if (candidate) {
      total += candidate.netCost;
    }
  }

  return total;
}
