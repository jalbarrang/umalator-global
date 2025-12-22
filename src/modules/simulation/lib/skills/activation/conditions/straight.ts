import { immediate, notSupported } from '../helpers';
import { StraightRandomPolicy } from '../policies/StraightRandomPolicy';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import { Region } from '@/modules/simulation/lib/utils/Region';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

export const StraightConditions = {
  straight_random: {
    samplePolicy: StraightRandomPolicy,
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be straight_random==1');
      }
      return regions.rmap((r) => course.straights.map((s) => r.intersect(s)));
    },
    filterNeq: notSupported,
    filterLt: notSupported,
    filterLte: notSupported,
    filterGt: notSupported,
    filterGte: notSupported,
  },
  straight_front_type: immediate({
    filterEq(
      regions: RegionList,
      frontType: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (!(frontType == 1 || frontType == 2)) {
        throw new Error('frontType must be 1 or 2');
      }

      const straights = course.straights.filter((s) => s.frontType == frontType);
      return regions.rmap((r) => straights.map((s) => r.intersect(s)));
    },
  }),
  is_last_straight: immediate({
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be is_last_straight_onetime==1');
      }
      if (!CourseHelpers.isSortedByStart(course.straights)) {
        throw new Error('course straights must be sorted by start');
      }
      const lastStraight = course.straights[course.straights.length - 1];
      return regions.rmap((r) => r.intersect(lastStraight));
    },
  }),
  is_last_straight_onetime: immediate({
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be is_last_straight_onetime==1');
      }

      if (!CourseHelpers.isSortedByStart(course.straights)) {
        throw new Error('course straights must be sorted by start');
      }

      const lastStraightStart = course.straights[course.straights.length - 1].start;

      // TODO ask kuromi about this or something
      const trigger = new Region(lastStraightStart, lastStraightStart + 10);

      return regions.rmap((r) => r.intersect(trigger));
    },
  }),
  /**
   * Picks a random point on the last straight.
   */
  last_straight_random: immediate({
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be last_straight_random==1');
      }

      if (!CourseHelpers.isSortedByStart(course.straights)) {
        throw new Error('course straights must be sorted by start');
      }

      return regions.rmap((r) => course.straights.map((s) => r.intersect(s)));
    },
  }),
};
