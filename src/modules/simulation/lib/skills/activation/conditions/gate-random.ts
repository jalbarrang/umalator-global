import { immediate } from '../helpers';
import type { CourseData, RaceParameters, RaceState } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { DynamicCondition } from '@/modules/simulation/lib/skills/activation/ConditionRegistry';

export const GateRandomConditions = {
  post_number: (function () {
    function gateBlock(s: RaceState, numUmas: number) {
      const gateNumber = s.gateRoll % numUmas; // modulo result guaranteed to be uniformly distributed due to the properties of s.gateRoll
      // see comment in RaceSolver.ts where gateRoll is initialized
      if (gateNumber < 9) return gateNumber;
      else return 1 + ((24 - gateNumber) % 8);
    }
    return immediate({
      filterEq(
        regions: RegionList,
        post: number,
        _0: CourseData,
        _1: RunnerParameters,
        extra: RaceParameters,
      ) {
        return [regions, (s: RaceState) => gateBlock(s, extra.numUmas || 9) == post] as [
          RegionList,
          DynamicCondition,
        ];
      },
      filterLte(
        regions: RegionList,
        post: number,
        _0: CourseData,
        _1: RunnerParameters,
        extra: RaceParameters,
      ) {
        return [regions, (s: RaceState) => gateBlock(s, extra.numUmas || 9) <= post] as [
          RegionList,
          DynamicCondition,
        ];
      },
      filterGte(
        regions: RegionList,
        post: number,
        _0: CourseData,
        _1: RunnerParameters,
        extra: RaceParameters,
      ) {
        return [regions, (s: RaceState) => gateBlock(s, extra.numUmas || 9) >= post] as [
          RegionList,
          DynamicCondition,
        ];
      },
    });
  })(),
  random_lot: immediate({
    filterEq(
      regions: RegionList,
      lot: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.randomLot < lot] as [RegionList, DynamicCondition];
    },
  }),
  is_activate_other_skill_detail: immediate({
    filterEq(
      regions: RegionList,
      one: number,
      _0: CourseData,
      _1: RunnerParameters,
      extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be is_activate_other_skill_detail==1');
      }

      return [regions, (s: RaceState) => s.usedSkills.has(extra.skillId)] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  is_used_skill_id: immediate({
    filterEq(
      regions: RegionList,
      skillId: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.usedSkills.has('' + skillId)] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
};
