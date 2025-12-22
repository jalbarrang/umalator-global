import { immediate, noopImmediate, noopSectionRandom, uniformRandom } from '../helpers';
import type { CourseData, RaceParameters, RaceState } from '@/modules/simulation/lib/core/types';
import type { DynamicCondition } from '@/modules/simulation/lib/skills/activation/ConditionRegistry';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

export const SpecialStatesConditions = {
  // Rushed state
  is_temptation: noopImmediate,
  temptation_count: noopImmediate,
  temptation_count_behind: noopSectionRandom(2, 9),
  temptation_count_infront: noopSectionRandom(2, 9),
  // Dueling
  compete_fight_count: uniformRandom({
    filterGt(
      regions: RegionList,
      _0: number,
      course: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (!CourseHelpers.isSortedByStart(course.straights)) {
        throw new Error('course straights must be sorted by start');
      }

      const lastStraight = course.straights[course.straights.length - 1];
      return regions.rmap((r) => r.intersect(lastStraight));
    },
  }),
  // Late Start
  is_badstart: immediate({
    filterEq(
      regions: RegionList,
      flag: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (flag !== 0 && flag !== 1) {
        throw new Error('must be is_badstart==0 or is_badstart==1');
      }

      const f = flag
        ? (s: RaceState) => s.startDelay > 0.08
        : (s: RaceState) => s.startDelay <= 0.08;
      return [regions, f] as [RegionList, DynamicCondition];
    },
  }),
};
