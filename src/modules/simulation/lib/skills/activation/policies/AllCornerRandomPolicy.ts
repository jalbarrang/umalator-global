import type { PRNG } from '@/modules/simulation/lib/utils/Random';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { ActivationSamplePolicy } from './ActivationSamplePolicy';
import { Region } from '@/modules/simulation/lib/utils/Region';

export const AllCornerRandomPolicy = {
  placeTriggers(regions: RegionList, rng: PRNG) {
    const triggers = [];

    const regionCandidates = regions.toSorted((a, b) => a.start - b.start);

    while (triggers.length < 4 && regionCandidates.length > 0) {
      const candidateIndex = rng.uniform(regionCandidates.length);

      const regionCandidate = regionCandidates[candidateIndex];
      const start =
        regionCandidate.start + rng.uniform(regionCandidate.end - regionCandidate.start - 10);

      // note that as each corner's end cannot come after the start of the next corner, this maintains that the candidates
      // are sorted by start
      if (start + 20 <= regionCandidate.end) {
        regionCandidates.splice(candidateIndex, 1, new Region(start + 10, regionCandidate.end));
      } else {
        regionCandidates.splice(candidateIndex, 1);
      }

      regionCandidates.splice(0, candidateIndex); // everything before this corner in the array is guaranteed to be before it in distance
      triggers.push(start);
    }

    // TODO support multiple triggers for skills with cooldown
    return new Region(triggers[0], triggers[0] + 10); // guaranteed to be the earliest trigger since each trigger is placed after the last one
  },

  sample(regions: RegionList, nsamples: number, rng: PRNG) {
    const samples = [];
    for (let i = 0; i < nsamples; ++i) {
      samples.push(this.placeTriggers(regions, rng));
    }
    return samples;
  },
  reconcile(other: ActivationSamplePolicy) {
    return other.reconcileAllCornerRandom(this);
  },
  reconcileImmediate(_: ActivationSamplePolicy) {
    return this;
  },
  reconcileDistributionRandom(_: ActivationSamplePolicy) {
    return this;
  },
  reconcileRandom(_: ActivationSamplePolicy) {
    return this;
  },
  reconcileStraightRandom(_: ActivationSamplePolicy) {
    throw new Error('cannot reconcile StraightRandomPolicy with AllCornerRandomPolicy');
  },
  reconcileAllCornerRandom(_: ActivationSamplePolicy) {
    return this;
  },
};
