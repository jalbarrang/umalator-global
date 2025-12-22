import { DistributionRandomPolicy } from '../DistributionRandomPolicy';
import type { PRNG } from '@/modules/simulation/lib/utils/Random';

export class ErlangRandomPolicy extends DistributionRandomPolicy {
  constructor(
    readonly k: number,
    readonly lambda: number,
  ) {
    super();
  }

  distribution(upper: number, nsamples: number, rng: PRNG) {
    const nums = [];
    let min = Infinity,
      max = 0.0;
    for (let i = 0; i < nsamples; ++i) {
      let u = 1.0;
      for (let j = 0; j < this.k; ++j) {
        u *= rng.random();
      }
      const n = -Math.log(u) / this.lambda;
      min = Math.min(min, n);
      max = Math.max(max, n);
      nums.push(n);
    }
    if (nsamples == 1) {
      const scale = 18;
      return nums.map((n) => Math.floor(upper * Math.min(n / scale, 1.0)));
    }
    const range = max - min;
    return nums.map((n) => Math.floor((upper * (n - min)) / range));
  }
}
