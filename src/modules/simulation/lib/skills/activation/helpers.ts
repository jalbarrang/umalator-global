import { CourseHelpers } from '../../course/CourseData';
import { ImmediatePolicy } from './policies/ImmediatePolicy';
import { RandomPolicy } from './policies/RandomPolicy';
import { LogNormalRandomPolicy } from './policies/distribution/LogNormalRandomPolicy';
import { ErlangRandomPolicy } from './policies/distribution/ErlangRandomPolicy';
import { UniformRandomPolicy } from './policies/distribution/UniformRandomPolicy';
import type { Condition } from './ConditionRegistry';
import type { PRNG } from '@/modules/simulation/lib/utils/Random';
import type { ActivationSamplePolicy } from './policies/ActivationSamplePolicy';
import type { DistributionRandomPolicy } from './policies/DistributionRandomPolicy';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import { Region, RegionList } from '@/modules/simulation/lib/utils/Region';
import { calculateEarlyRaceAverageSpeed } from '@/modules/simulation/lib/physics/health/SpurtCalculator';

// ============================================================================
// Helper Functions
// ============================================================================

export function notSupported(): never {
  throw new Error('unsupported comparison');
}

function noop(
  regions: RegionList,
  _1: number,
  _2: CourseData,
  _3: RunnerParameters,
  _extra: RaceParameters,
) {
  return regions;
}

const noopAll: Omit<Condition, 'samplePolicy'> = {
  filterEq: noop,
  filterNeq: noop,
  filterLt: noop,
  filterLte: noop,
  filterGt: noop,
  filterGte: noop,
};

// ============================================================================
// Condition Builders
// ============================================================================

export const noopImmediate: Condition = {
  ...noopAll,
  samplePolicy: ImmediatePolicy,
};

export const noopRandom: Condition = {
  ...noopAll,
  samplePolicy: RandomPolicy,
};

const defaultImmediate: Condition = {
  samplePolicy: ImmediatePolicy,
  filterEq: notSupported,
  filterNeq: notSupported,
  filterLt: notSupported,
  filterLte: notSupported,
  filterGt: notSupported,
  filterGte: notSupported,
};

export function immediate(other: Partial<Condition>): Condition {
  return { ...defaultImmediate, ...other };
}

const defaultRandom: Condition = {
  samplePolicy: RandomPolicy,
  filterEq: notSupported,
  filterNeq: notSupported,
  filterLt: notSupported,
  filterLte: notSupported,
  filterGt: notSupported,
  filterGte: notSupported,
};

export function random(other: Partial<Condition>): Condition {
  return { ...defaultRandom, ...other };
}

// ============================================================================
// Distribution Random Factories
// ============================================================================

type DistributionRandomPolicyConstructor<TArgs extends Array<unknown>> = new (
  ...args: TArgs
) => DistributionRandomPolicy;

// prev mantainer: ive tried various things to make this return a [xRandom,noopXRandom] pair but seem to run into some typescript bugs
// or something
// it doesnt really make sense to me
const distributionRandomFactory = <TArgs extends Array<unknown>>(
  cls: DistributionRandomPolicyConstructor<TArgs>,
) => {
  const cache = Object.create(null);

  return (...args: [...clsArgs: TArgs, condition: Partial<Condition>]) => {
    const condition = args.pop() as Partial<Condition>;
    const key = args.join(',');

    let policy: DistributionRandomPolicy;
    if (cache[key]) {
      policy = cache[key];
    } else {
      policy = new cls(...(args as unknown as TArgs));
      cache[key] = policy;
    }

    const notSupportedCondition: Condition = {
      samplePolicy: policy,
      filterEq: notSupported,
      filterNeq: notSupported,
      filterLt: notSupported,
      filterLte: notSupported,
      filterGt: notSupported,
      filterGte: notSupported,
    };

    return { ...notSupportedCondition, ...condition };
  };
};

export const logNormalRandom = distributionRandomFactory(LogNormalRandomPolicy);
export const erlangRandom = distributionRandomFactory(ErlangRandomPolicy);
export const uniformRandom = distributionRandomFactory(UniformRandomPolicy);

export const noopLogNormalRandom = (mu: number, sigma: number) => {
  return logNormalRandom(mu, sigma, noopAll);
};

export const noopErlangRandom = (k: number, lambda: number) => {
  return erlangRandom(k, lambda, noopAll);
};

export const noopUniformRandom = uniformRandom(noopAll);

// ============================================================================
// Value Filter (for simple stat-based conditions)
// ============================================================================

export function valueFilter(
  getValue: (c: CourseData, h: RunnerParameters, e: RaceParameters) => number,
) {
  return immediate({
    filterEq(
      regions: RegionList,
      value: number,
      course: CourseData,
      horse: RunnerParameters,
      extra: RaceParameters,
    ) {
      return getValue(course, horse, extra) == value ? regions : new RegionList();
    },
    filterNeq(
      regions: RegionList,
      value: number,
      course: CourseData,
      horse: RunnerParameters,
      extra: RaceParameters,
    ) {
      return getValue(course, horse, extra) != value ? regions : new RegionList();
    },
    filterLt(
      regions: RegionList,
      value: number,
      course: CourseData,
      horse: RunnerParameters,
      extra: RaceParameters,
    ) {
      return getValue(course, horse, extra) < value ? regions : new RegionList();
    },
    filterLte(
      regions: RegionList,
      value: number,
      course: CourseData,
      horse: RunnerParameters,
      extra: RaceParameters,
    ) {
      return getValue(course, horse, extra) <= value ? regions : new RegionList();
    },
    filterGt(
      regions: RegionList,
      value: number,
      course: CourseData,
      horse: RunnerParameters,
      extra: RaceParameters,
    ) {
      return getValue(course, horse, extra) > value ? regions : new RegionList();
    },
    filterGte(
      regions: RegionList,
      value: number,
      course: CourseData,
      horse: RunnerParameters,
      extra: RaceParameters,
    ) {
      return getValue(course, horse, extra) >= value ? regions : new RegionList();
    },
  });
}

// ============================================================================
// Region Shifting (for time-based conditions)
// ============================================================================

/**
 * Shifts skill activation regions forward to prevent skills with time conditions
 * (e.g. >=1s) from incorrectly activating at race start (0s).
 *
 * Uses course-aware early-race average speed estimation based on start dash mechanics
 * (acceleration from 3 m/s to 0.85 × baseSpeed).
 */
export function shiftRegionsForwardByMinTime(
  regions: RegionList,
  minTime: number,
  course: CourseData,
  _: RunnerParameters,
  _extra: RaceParameters,
) {
  const avgSpeed = calculateEarlyRaceAverageSpeed(course.distance);
  const minDistance = avgSpeed * minTime;

  return regions.rmap((r) => {
    if (r.start < minDistance) {
      return r.intersect({ start: minDistance, end: course.distance });
    }
    return r;
  });
}

/**
 * Creates a fixed position sample policy that forces a skill to activate at a specific distance.
 * This ignores the skill's normal activation conditions and places the trigger at the exact position specified.
 * @param position The distance (in meters) where the skill should activate
 * @returns An ActivationSamplePolicy that always triggers at the specified position
 */
export function createFixedPositionPolicy(position: number): ActivationSamplePolicy {
  return {
    sample(_regions: RegionList, nsamples: number, _rng: PRNG) {
      // Always return the same fixed position for all samples
      const samples = [];
      for (let i = 0; i < nsamples; ++i) {
        samples.push(new Region(position, position + 10));
      }
      return samples;
    },
    reconcile(_other: ActivationSamplePolicy) {
      return this;
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
      return this;
    },
    reconcileAllCornerRandom(_: ActivationSamplePolicy) {
      return this;
    },
  };
}

export function orderInFilter(rate: number) {
  return immediate({
    filterEq(
      regions: RegionList,
      one: number,
      _0: CourseData,
      _1: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be order_rate_inXX_continue==1');
      }

      if (extra.orderRange && extra.numUmas) {
        const [start, end] = extra.orderRange;

        if (start < 1 || start > end) {
          throw new Error('Invalid order range');
        }

        const changeRate = Math.round(rate * extra.numUmas);

        return start <= changeRate ? regions : new RegionList();
      }

      return regions;
    },
  });
}

export function orderOutFilter(rate: number) {
  return immediate({
    filterEq(
      regions: RegionList,
      one: number,
      _0: CourseData,
      _1: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be order_rate_outXX_continue==1');
      }

      if (extra.orderRange && extra.numUmas) {
        if (!(extra.orderRange[0] <= extra.orderRange[1] && extra.orderRange[1] <= extra.numUmas)) {
          throw new Error('Invalid order range');
        }

        return Math.round(rate * extra.numUmas) <= extra.orderRange[1] ? regions : new RegionList();
      }

      return regions;
    },
  });
}

export function orderFilter(getPos: (arg: number, n: number) => number) {
  return immediate({
    filterEq(
      regions: RegionList,
      arg: number,
      _0: CourseData,
      _1: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (extra.orderRange && extra.numUmas) {
        const pos = getPos(arg, extra.numUmas);
        return pos >= extra.orderRange[0] && pos <= extra.orderRange[1]
          ? regions
          : new RegionList();
      }

      return regions;
    },
    filterNeq(
      regions: RegionList,
      arg: number,
      _0: CourseData,
      _1: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (extra.orderRange && extra.numUmas) {
        const pos = getPos(arg, extra.numUmas);

        return pos < extra.orderRange[0] || pos > extra.orderRange[1] ? regions : new RegionList();
      }

      return regions;
    },
    filterLt(
      regions: RegionList,
      arg: number,
      course: CourseData,
      _: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (extra.orderRange && extra.numUmas) {
        if (!(1 <= extra.orderRange[0] && extra.orderRange[0] <= extra.orderRange[1])) {
          throw new Error('Invalid order range');
        }
        // ignore forward order conditions in the last leg (important for e.g. NY Opera unique)
        // however, add some room after the start of last leg so that forward order skills that proc at the
        // beginning of last leg won't proc on backlines
        const end = new Region(CourseHelpers.phaseStart(course.distance, 2) + 100, course.distance);

        const pos = getPos(arg, extra.numUmas);

        return extra.orderRange[0] < pos ? regions : regions.rmap((r) => r.intersect(end));
      }
      return regions;
    },
    filterLte(
      regions: RegionList,
      arg: number,
      course: CourseData,
      _: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (extra.orderRange && extra.numUmas) {
        if (!(1 <= extra.orderRange[0] && extra.orderRange[0] <= extra.orderRange[1])) {
          throw new Error('Invalid order range');
        }

        const end = new Region(CourseHelpers.phaseStart(course.distance, 2) + 100, course.distance);
        const pos = getPos(arg, extra.numUmas);
        return extra.orderRange[0] <= pos ? regions : regions.rmap((r) => r.intersect(end));
      }

      return regions;
    },
    filterGt(
      regions: RegionList,
      arg: number,
      _0: CourseData,
      _1: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (extra.orderRange && extra.numUmas) {
        if (!(extra.orderRange[0] <= extra.orderRange[1] && extra.orderRange[1] <= extra.numUmas)) {
          throw new Error('Invalid order range');
        }

        const pos = getPos(arg, extra.numUmas);
        return pos < extra.orderRange[1] ? regions : new RegionList();
      }
      return regions;
    },
    filterGte(
      regions: RegionList,
      arg: number,
      _0: CourseData,
      _1: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (extra.orderRange && extra.numUmas) {
        if (!(extra.orderRange[0] <= extra.orderRange[1] && extra.orderRange[1] <= extra.numUmas)) {
          throw new Error('Invalid order range');
        }

        const pos = getPos(arg, extra.numUmas);
        return pos <= extra.orderRange[1] ? regions : new RegionList();
      }
      return regions;
    },
  });
}

export function noopSectionRandom(start: number, end: number) {
  function sectionRandom(
    regions: RegionList,
    _0: number,
    course: CourseData,
    _1: RunnerParameters,
    _extra: RaceParameters,
  ) {
    const bounds = new Region(start * (course.distance / 24), end * (course.distance / 24));
    return regions.rmap((r) => r.intersect(bounds));
  }
  return random({
    filterEq: sectionRandom,
    filterNeq: sectionRandom,
    filterLt: sectionRandom,
    filterLte: sectionRandom,
    filterGt: sectionRandom,
    filterGte: sectionRandom,
  });
}
