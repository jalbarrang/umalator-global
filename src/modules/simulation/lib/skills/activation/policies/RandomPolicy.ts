import type { PRNG } from '@/modules/simulation/lib/utils/Random';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { ActivationSamplePolicy } from './ActivationSamplePolicy';
import { Region } from '@/modules/simulation/lib/utils/Region';

export const RandomPolicy = {
  sample(regions: RegionList, nsamples: number, rng: PRNG) {
    if (regions.length == 0) {
      return [];
    }
    let acc = 0;
    const weights = regions.map((r) => (acc += r.end - r.start));
    const samples = [];

    for (let i = 0; i < nsamples; ++i) {
      const threshold = rng.uniform(acc);
      const region = regions.find((_, regionIndex) => weights[regionIndex] > threshold)!;
      samples.push(region.start + rng.uniform(region.end - region.start - 10));
    }

    return samples.map((pos) => new Region(pos, pos + 10));
  },
  reconcile(other: ActivationSamplePolicy) {
    return other.reconcileRandom(this);
  },
  reconcileImmediate(_: ActivationSamplePolicy) {
    return this;
  },
  reconcileDistributionRandom(_other: ActivationSamplePolicy) {
    return this;
  },
  reconcileRandom(other: ActivationSamplePolicy) {
    return other;
  },
  reconcileStraightRandom(other: ActivationSamplePolicy) {
    return other;
  },
  reconcileAllCornerRandom(other: ActivationSamplePolicy) {
    return other;
  },
};
