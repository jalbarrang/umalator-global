import { immediate, notSupported, random, valueFilter } from '../helpers';
import { AllCornerRandomPolicy } from '../policies/AllCornerRandomPolicy';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { Region, RegionList } from '@/modules/simulation/lib/utils/Region';

export const CornerConditions = {
  corner: immediate({
    filterEq(
      regions: RegionList,
      cornerNum: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (cornerNum == 0) {
        // can't simply use straights here as there may be parts of a course which are neither corners nor straights
        let lastEnd = 0;
        const nonCorners = course.corners.map((c) => {
          const r = new Region(lastEnd, c.start);
          lastEnd = c.start + c.length;
          return r;
        });
        if (lastEnd != course.distance) {
          nonCorners.push(new Region(lastEnd, course.distance));
        }
        return regions.rmap((r) => nonCorners.map((s) => r.intersect(s)));
      } else if (course.corners.length + cornerNum >= 5) {
        const corners: Array<Region> = [];

        for (
          let cornerIdx = course.corners.length + cornerNum - 5;
          cornerIdx >= 0;
          cornerIdx -= 4
        ) {
          const corner = course.corners[cornerIdx];
          corners.push(new Region(corner.start, corner.start + corner.length));
        }

        corners.reverse();

        return regions.rmap((r) => corners.map((c) => r.intersect(c)));
      } else {
        return new RegionList();
      }
    },
    filterNeq(
      regions: RegionList,
      cornerNum: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (cornerNum !== 0) {
        throw new Error('only supports corner!=0');
      }
      const corners = course.corners.map((c) => new Region(c.start, c.start + c.length));
      return regions.rmap((r) => corners.map((c) => r.intersect(c)));
    },
  }),
  corner_count: valueFilter(
    (course: CourseData, _: RunnerParameters, _extra: RaceParameters) => course.corners.length,
  ),
  // FIXME this shouldn't actually be random, since in cases like corner_random==1@corner_random==2 it should sample
  // only from the first corner and not from the combined regions, so it needs its own sample policy
  // actually, that's slightly annoying to handle since corners come in back-to-back pairs, so their regions will
  // get merged by the union operation.
  // the real way to fix this is to finally allow placing multiple triggers, then each branch of an @ can simply
  // place its own trigger and the problem goes away.
  corner_random: random({
    filterEq(
      regions: RegionList,
      cornerNum: number,
      course: CourseData,
      _: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }
      // FIXME annoying hack for the corner skills. TEMPORARY. see the note above for why we do this. this condition is
      // considerably more important in global than in jp (since early global does not have all_corner_random)
      // these are all the corner_random==1@corner_random==2@corner_random==3@corner_random==4 skills
      if (
        [
          '200331',
          '200332',
          '200333',
          '200341',
          '200342',
          '200343',
          '200351',
          '200352',
          '200353',
          '200971',
          '200972',
          '201041',
          '201042',
          '201111',
          '201112',
          '201181',
          '201182',
          '201251',
          '201252',
          '201321',
          '201322',
          '201391',
          '201392',
          '201461',
          '201462',
        ].indexOf(extra.skillId) > -1
      ) {
        if (cornerNum == 1) {
          const corner = course.corners[Math.max(course.corners.length - 4, 0)];
          const cornerBounds = new Region(corner.start, corner.start + corner.length);
          return regions.rmap((r) => r.intersect(cornerBounds));
        } else {
          return new RegionList();
        }
      }
      if (course.corners.length + cornerNum >= 5) {
        const corner = course.corners[course.corners.length + cornerNum - 5];
        const cornerBounds = new Region(corner.start, corner.start + corner.length);
        return regions.rmap((r) => r.intersect(cornerBounds));
      } else {
        return new RegionList();
      }
    },
  }),
  all_corner_random: {
    samplePolicy: AllCornerRandomPolicy,
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be all_corner_random==1');
      }

      const corners = course.corners.map((c) => new Region(c.start, c.start + c.length));
      return regions.rmap((r) => corners.map((c) => r.intersect(c)));
    },
    filterNeq: notSupported,
    filterLt: notSupported,
    filterLte: notSupported,
    filterGt: notSupported,
    filterGte: notSupported,
  },
  is_finalcorner: immediate({
    filterEq(
      regions: RegionList,
      flag: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (flag !== 0 && flag !== 1) {
        throw new Error('must be is_finalcorner==0 or is_finalcorner==1');
      }

      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (course.corners.length == 0) {
        return new RegionList();
      }
      const finalCornerStart = course.corners[course.corners.length - 1].start;
      const bounds = flag
        ? new Region(finalCornerStart, course.distance)
        : new Region(0, finalCornerStart);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  is_finalcorner_laterhalf: immediate({
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be is_finalcorner_laterhalf==1');
      }

      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (course.corners.length == 0) {
        return new RegionList();
      }

      const fc = course.corners[course.corners.length - 1];
      const bounds = new Region((fc.start + fc.start + fc.length) / 2, fc.start + fc.length);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
  is_finalcorner_random: random({
    filterEq(
      regions: RegionList,
      one: number,
      course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be is_finalcorner_random==1');
      }

      if (!CourseHelpers.isSortedByStart(course.corners)) {
        throw new Error('course corners must be sorted by start');
      }

      if (course.corners.length == 0) {
        return new RegionList();
      }
      const fc = course.corners[course.corners.length - 1];
      const bounds = new Region(fc.start, fc.start + fc.length);
      return regions.rmap((r) => r.intersect(bounds));
    },
  }),
};
