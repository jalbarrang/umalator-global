import { immediate, noopImmediate, noopSectionRandom, valueFilter } from '../helpers';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import { RegionList } from '@/modules/simulation/lib/utils/Region';
import { Strategy, StrategyHelpers } from '@/modules/simulation/lib/runner/types';

export const StrategyConditions = {
  running_style: immediate({
    filterEq(
      regions: RegionList,
      strategy: number,
      _: CourseData,
      horse: RunnerParameters,
      _extra: RaceParameters,
    ) {
      StrategyHelpers.assertIsStrategy(strategy);
      if (StrategyHelpers.strategyMatches(horse.strategy, strategy)) {
        return regions;
      } else {
        return new RegionList();
      }
    },
  }),
  running_style_count_same: noopImmediate,
  running_style_count_same_rate: noopImmediate,
  // these are used exclusively on debuffs, in which case they only get added to /us/ from the "other" perspective, in which case
  // we actually want them to active if /our/ strategy matches the condition
  // NB. this seems kind of questionable in general. perhaps a perspective member should be added to RaceParameters.
  // also, abusing valueFilter like this only works because these conditions are used like running_style_count_nige_otherself>=1
  running_style_count_nige_otherself: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) =>
      +StrategyHelpers.strategyMatches(horse.strategy, Strategy.FrontRunner),
  ),
  running_style_count_senko_otherself: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) =>
      +StrategyHelpers.strategyMatches(horse.strategy, Strategy.PaceChaser),
  ),
  running_style_count_sashi_otherself: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) =>
      +StrategyHelpers.strategyMatches(horse.strategy, Strategy.LateSurger),
  ),
  running_style_count_oikomi_otherself: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) =>
      +StrategyHelpers.strategyMatches(horse.strategy, Strategy.EndCloser),
  ),
  running_style_equal_popularity_one: noopImmediate,
  running_style_temptation_count_nige: noopSectionRandom(2, 9),
  running_style_temptation_count_senko: noopSectionRandom(2, 9),
  running_style_temptation_count_sashi: noopSectionRandom(2, 9),
  running_style_temptation_count_oikomi: noopSectionRandom(2, 9),
  same_skill_horse_count: noopImmediate,
};
