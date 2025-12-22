import type { PRNG } from '@/modules/simulation/lib/utils/Random';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { ActivationSamplePolicy } from './ActivationSamplePolicy';

export const ImmediatePolicy = {
  sample(regions: RegionList, _0: number, _1: PRNG) {
    return regions.slice(0, 1);
  },
  reconcile(other: ActivationSamplePolicy) {
    return other.reconcileImmediate(this);
  },
  reconcileImmediate(other: ActivationSamplePolicy) {
    return other;
  },
  reconcileDistributionRandom(other: ActivationSamplePolicy) {
    return other;
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
