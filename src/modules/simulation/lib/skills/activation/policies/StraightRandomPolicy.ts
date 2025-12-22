import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { ActivationSamplePolicy } from './ActivationSamplePolicy';
import type { PRNG } from '@/modules/simulation/lib/utils/Random';
import { Region } from '@/modules/simulation/lib/utils/Region';

export const StraightRandomPolicy = {
  sample(regions: RegionList, nsamples: number, rng: PRNG) {
    // regular RandomPolicy weights regions by their length, so any given point has an equal chance to be chosen across all regions
    // StraightRandomPolicy first picks a region with equal chance regardless of length, and then picks a random point on that region
    if (regions.length == 0) {
      return [];
    }
    const samples = [];
    for (let i = 0; i < nsamples; ++i) {
      const r = regions[rng.uniform(regions.length)];
      samples.push(r.start + rng.uniform(r.end - r.start - 10));
    }
    return samples.map((pos) => new Region(pos, pos + 10));
  },
  reconcile(other: ActivationSamplePolicy) {
    return other.reconcileStraightRandom(this);
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
  reconcileStraightRandom(other: ActivationSamplePolicy) {
    return other;
  },
  reconcileAllCornerRandom(_: ActivationSamplePolicy) {
    throw new Error('cannot reconcile StraightRandomPolicy with AllCornerRandomPolicy');
  },
};
