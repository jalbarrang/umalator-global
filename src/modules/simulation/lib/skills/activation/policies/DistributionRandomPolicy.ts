import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { PRNG } from '@/modules/simulation/lib/utils/Random';
import type { ActivationSamplePolicy } from './ActivationSamplePolicy';
import { Region } from '@/modules/simulation/lib/utils/Region';

export abstract class DistributionRandomPolicy {
  abstract distribution(upper: number, nsamples: number, rng: PRNG): Array<number>;

  sample(regions: RegionList, nsamples: number, rng: PRNG) {
    if (regions.length == 0) {
      return [];
    }
    const range = regions.reduce((acc, r) => acc + r.end - r.start, 0);
    const regionsSorted = regions.toSorted((a, b) => a.start - b.start);
    const randoms = this.distribution(range, nsamples, rng);
    const samples = [];

    for (let i = 0; i < nsamples; ++i) {
      let pos = randoms[i];

      for (let j = 0; ; j++) {
        pos += regionsSorted[j].start;

        if (pos > regionsSorted[j].end) {
          pos -= regionsSorted[j].end;
          continue;
        }

        samples.push(new Region(pos, regionsSorted[j].end));
        break;
      }
    }
    return samples;
  }

  reconcile(other: ActivationSamplePolicy) {
    return other.reconcileDistributionRandom(this);
  }

  reconcileImmediate(_: ActivationSamplePolicy) {
    return this;
  }

  reconcileDistributionRandom(_: ActivationSamplePolicy) {
    // this is, strictly speaking, probably not the right thing to do
    // probably this should be the joint probability distribution of `this` and `other`, but that is too complex to implement
    // TODO this is something of a stopgap measure anyway, since eventually we'd like to model most of the conditions that use
    // DistributionRandomPolicy with dynamic conditions using a Poisson process or something, which would make this obsolete
    // (this would also enable other features like cooldowns for distribution-random skills).
    return this;
  }
  // this is probably not exactly the right thing to do either, but the true random conditions do need to place a fixed trigger
  // statically ahead of time, uninfluenced by us. this means that the only alternatives are 1) this condition is coincidentally
  // fulfilled during the static random trigger or 2) the skill does not activate at all.
  // since the latter is not particularly interesting, it's safe to just ignore this sample policy and use only the true random one.
  reconcileRandom(other: ActivationSamplePolicy) {
    return other;
  }
  reconcileStraightRandom(other: ActivationSamplePolicy) {
    return other;
  }
  reconcileAllCornerRandom(other: ActivationSamplePolicy) {
    return other;
  }
}
