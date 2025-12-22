import { DistributionRandomPolicy } from '../DistributionRandomPolicy';
import type { PRNG } from '@/modules/simulation/lib/utils/Random';

export class LogNormalRandomPolicy extends DistributionRandomPolicy {
  constructor(
    readonly mu: number,
    readonly sigma: number,
  ) {
    super();
  }

  distribution(upper: number, nsamples: number, rng: PRNG) {
    // see <https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform>
    const nums = [];
    let min = Infinity;
    let max = 0.0;
    const halfn = Math.ceil(nsamples / 2);
    for (let i = 0; i < halfn; ++i) {
      let x: number;
      let y: number;
      let r2: number;

      do {
        x = rng.random() * 2.0 - 1.0;
        y = rng.random() * 2.0 - 1.0;
        r2 = x * x + y * y;
      } while (r2 == 0.0 || r2 >= 1.0);

      const m = Math.sqrt((-2.0 * Math.log(r2)) / r2) * this.sigma;
      const a = Math.exp(x * m + this.mu);
      const b = Math.exp(y * m + this.mu);
      min = Math.min(min, a, b);
      max = Math.max(max, a, b);
      nums.push(a, b);
    }
    const range = max - min;
    return nums.map((n) => Math.floor((upper * (n - min)) / range));
  }
}
