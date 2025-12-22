import { immediate } from '../helpers';
import type { CourseData, RaceParameters, RaceState } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { RegionList } from '@/modules/simulation/lib/utils/Region';
import type { DynamicCondition } from '@/modules/simulation/lib/skills/activation/ConditionRegistry';

export const HealthConditions = {
  hp_per: immediate({
    filterLte(
      regions: RegionList,
      hpPer: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      hpPer /= 100;
      return [regions, (s: RaceState) => s.hp.hpRatioRemaining() <= hpPer] as [
        RegionList,
        DynamicCondition,
      ];
    },
    filterGte(
      regions: RegionList,
      hpPer: number,
      _0: CourseData,
      _1: RunnerParameters,
      _extra: RaceParameters,
    ) {
      hpPer /= 100;
      return [regions, (s: RaceState) => s.hp.hpRatioRemaining() >= hpPer] as [
        RegionList,
        DynamicCondition,
      ];
    },
  }),
  is_hp_empty_onetime: immediate({
    filterEq(
      regions: RegionList,
      one: number,
      _course: CourseData,
      _: RunnerParameters,
      _extra: RaceParameters,
    ) {
      if (one !== 1) {
        throw new Error('must be is_hp_empty_onetime==1');
      }

      return [regions, (s: RaceState) => !s.hp.hasRemainingHp()] as [RegionList, DynamicCondition];
    },
  }),
};
