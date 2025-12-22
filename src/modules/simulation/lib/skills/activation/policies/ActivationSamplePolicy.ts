import type { Region, RegionList } from '@/modules/simulation/lib/utils/Region';
import type { PRNG } from '@/modules/simulation/lib/utils/Random';

export interface ActivationSamplePolicy {
  sample: (regions: RegionList, nsamples: number, rng: PRNG) => Array<Region>;

  // essentially, when two conditions are combined with an AndOperator one should take precedence over the other
  // immediate transitions into anything and straight_random/all_corner_random dominate everything except each other
  // NB. currently there are no skills that combine straight_random or all_corner_random with anything other than
  // immediate conditions (running_style or distance_type), and obviously they are mutually exclusive with each other
  // the actual x_random (phase_random, down_slope_random, etc) ones should dominate the ones that are not actually
  // random but merely modeled with a probability distribution
  // use smalltalk-style double dispatch to implement the transitions
  reconcile: (other: ActivationSamplePolicy) => ActivationSamplePolicy;
  reconcileImmediate: (other: ActivationSamplePolicy) => ActivationSamplePolicy;
  reconcileDistributionRandom: (other: ActivationSamplePolicy) => ActivationSamplePolicy;
  reconcileRandom: (other: ActivationSamplePolicy) => ActivationSamplePolicy;
  reconcileStraightRandom: (other: ActivationSamplePolicy) => ActivationSamplePolicy;
  reconcileAllCornerRandom: (other: ActivationSamplePolicy) => ActivationSamplePolicy;
}
