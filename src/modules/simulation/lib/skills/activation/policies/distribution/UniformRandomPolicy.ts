import { DistributionRandomPolicy } from '../DistributionRandomPolicy';
import type { PRNG } from '@/modules/simulation/lib/utils/Random';

export class UniformRandomPolicy extends DistributionRandomPolicy {
  constructor() {
    super();
  }

  distribution(upper: number, nsamples: number, rng: PRNG) {
    const nums = [];
    for (let i = 0; i < nsamples; ++i) {
      nums.push(rng.uniform(upper));
    }
    return nums;
  }
}
