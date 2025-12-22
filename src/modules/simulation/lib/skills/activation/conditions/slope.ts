import { immediate, random } from '../helpers';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import { Region } from '@/modules/simulation/lib/utils/Region';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

export const SlopeConditions = {
  slope: immediate({
    filterEq(
      regions: RegionList,
      slopeType: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (slopeType !== 0 && slopeType !== 1 && slopeType !== 2) {
        throw new Error('slopeType must be 0, 1, or 2');
      }

      // Requires course.slopes is sorted by slope start— this is not always the case, since in course_data.json they are
      // (sometimes?) sorted first by uphill/downhill and then by start. They should be sorted when the course is loaded.
      if (!CourseHelpers.isSortedByStart(course.slopes)) {
        throw new Error('course slopes must be sorted by slope start');
      }

      let lastEnd = 0;
      const slopes = course.slopes.filter(
        (s) => (slopeType != 2 && s.slope > 0) || (slopeType != 1 && s.slope < 0),
      );
      const slopeR =
        slopeType == 0
          ? slopes.map((s) => {
              const r = new Region(lastEnd, s.start);
              lastEnd = s.start + s.length;
              return r;
            })
          : slopes.map((s) => new Region(s.start, s.start + s.length));
      if (slopeType == 0 && lastEnd != course.distance) {
        slopeR.push(new Region(lastEnd, course.distance));
      }
      return regions.rmap((r) => slopeR.map((s) => r.intersect(s)));
    },
  }),
  up_slope_random: random({
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be up_slope_random==1');
      }
      const slopes = course.slopes
        .filter((s) => s.slope > 0)
        .map((s) => new Region(s.start, s.start + s.length));
      return regions.rmap((r) => slopes.map((s) => r.intersect(s)));
    },
  }),
  down_slope_random: random({
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be down_slope_random==1');
      }

      const slopes = course.slopes
        .filter((s) => s.slope < 0)
        .map((s) => new Region(s.start, s.start + s.length));
      return regions.rmap((r) => slopes.map((s) => r.intersect(s)));
    },
  }),
};
