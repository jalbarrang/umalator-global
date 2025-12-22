import { immediate, valueFilter } from '../helpers';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import { RegionList } from '@/modules/simulation/lib/utils/Region';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

export const CourseConditions = {
  track_id: valueFilter(
    (course: CourseData, _: RunnerParameters, _extra: RaceParameters) => course.raceTrackId,
  ),
  distance_type: immediate({
    filterEq(
      regions: RegionList,
      distanceType: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsDistanceType(distanceType);
      if (course.distanceType == distanceType) {
        return regions;
      } else {
        return new RegionList();
      }
    },
    filterNeq(
      regions: RegionList,
      distanceType: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      CourseHelpers.assertIsDistanceType(distanceType);
      if (course.distanceType != distanceType) {
        return regions;
      } else {
        return new RegionList();
      }
    },
  }),
  ground_type: valueFilter(
    (course: CourseData, _: RunnerParameters, _extra: RaceParameters) => course.surface,
  ),
  ground_condition: valueFilter(
    (_0: CourseData, _1: RunnerParameters, extra: RaceParameters) => extra.groundCondition,
  ),
  rotation: valueFilter(
    (course: CourseData, _: RunnerParameters, _extra: RaceParameters) => course.turn,
  ),
  is_dirtgrade: immediate({
    filterEq(
      regions: RegionList,
      flag: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (flag !== 1) {
        throw new Error('must be is_dirtgrade==1');
      }

      return [10101, 10103, 10104, 10105].indexOf(course.raceTrackId) > -1
        ? regions
        : new RegionList();
    },
    filterNeq(
      regions: RegionList,
      flag: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (flag !== 1) {
        throw new Error('must be is_dirtgrade!=1');
      }

      return [10101, 10103, 10104, 10105].indexOf(course.raceTrackId) == -1
        ? regions
        : new RegionList();
    },
  }),
  is_basis_distance: immediate({
    filterEq(
      regions: RegionList,
      flag: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (flag !== 0 && flag !== 1) {
        throw new Error('must be is_basis_distance==0 or is_basis_distance==1');
      }

      return Math.min(course.distance % 400, 1) != flag ? regions : new RegionList();
    },
  }),
};
