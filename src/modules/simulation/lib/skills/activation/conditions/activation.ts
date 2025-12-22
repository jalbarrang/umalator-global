import { immediate } from '../helpers';
import type { CourseData, RaceParameters, RaceState } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { DynamicCondition } from '@/modules/simulation/lib/skills/activation/ConditionRegistry';

export const ActivationConditions = {
  accumulatetime: immediate({
    filterGte(
      regions: RegionList,
      t: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.accumulatetime.t >= t] as [RegionList, DynamicCondition];
    },
  }),
  activate_count_all: immediate({
    filterLte(
      regions: RegionList,
      n: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.activateCount.reduce((a, b) => a + b) <= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
    filterGte(
      regions: RegionList,
      n: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.activateCount.reduce((a, b) => a + b) >= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  activate_count_end_after: immediate({
    filterGte(
      regions: RegionList,
      n: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.activateCount[2] >= n] as [RegionList, DynamicCondition];
    },
  }),
  activate_count_heal: immediate({
    filterGte(
      regions: RegionList,
      n: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.activateCountHeal >= n] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  activate_count_middle: immediate({
    filterGte(
      regions: RegionList,
      n: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.activateCount[1] >= n] as [RegionList, DynamicCondition];
    },
  }),
  activate_count_start: immediate({
    filterGte(
      regions: RegionList,
      n: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      return [regions, (s: RaceState) => s.activateCount[0] >= n] as [RegionList, DynamicCondition];
    },
  }),
};
