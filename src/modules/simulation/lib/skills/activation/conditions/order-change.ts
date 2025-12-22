import { erlangRandom, noopErlangRandom } from '../helpers';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import { Region, RegionList } from '@/modules/simulation/lib/utils/Region';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

export const OrderChangeConditions = {
  is_overtake: noopErlangRandom(1, 2.0),
  overtake_target_no_order_up_time: noopErlangRandom(3, 2.0),
  overtake_target_time: noopErlangRandom(3, 2.0),
  change_order_onetime: noopErlangRandom(3, 2.0),
  change_order_up_end_after: erlangRandom(3, 2.0, {
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(CourseHelpers.phaseStart(course.distance, 2), course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  change_order_up_finalcorner_after: erlangRandom(3, 2.0, {
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (course.corners.length == 0) {
        return new RegionList();
      }
      const finalCornerStart = course.corners[course.corners.length - 1].start;
      const bounds = new Region(finalCornerStart, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  change_order_up_middle: erlangRandom(3, 2.0, {
    filterGte(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(
        CourseHelpers.phaseStart(course.distance, 1),
        CourseHelpers.phaseEnd(course.distance, 1),
      );
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
};
