import { immediate, noopImmediate, random, valueFilter } from '../helpers';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import { Region } from '@/modules/simulation/lib/utils/Region';

export const DistanceConditions = {
  course_distance: valueFilter(
    (course: CourseData, _: RunnerParameters, _extra: RaceParameters) => course.distance,
  ),
  distance_rate: immediate({
    filterLte(
      regions: RegionList,
      rate: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(0, (course.distance * rate) / 100);
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterGte(
      regions: RegionList,
      rate: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region((course.distance * rate) / 100, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  distance_rate_after_random: random({
    filterEq(
      regions: RegionList,
      rate: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region((course.distance * rate) / 100, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  remain_distance: immediate({
    filterEq(
      regions: RegionList,
      remain: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(course.distance - remain, course.distance - remain + 1);
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterLte(
      regions: RegionList,
      remain: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(course.distance - remain, course.distance);
      return regions.rmap((r) => r.intersect(bounds));
    },
    filterGte(
      regions: RegionList,
      remain: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      const bounds = new Region(0, course.distance - remain);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  distance_diff_rate: noopImmediate,
  distance_diff_top: noopImmediate,
  distance_diff_top_float: noopImmediate,
};
