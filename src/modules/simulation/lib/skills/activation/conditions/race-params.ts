import { noopImmediate, valueFilter } from '../helpers';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';

export const RaceParamsConditions = {
  grade: valueFilter((_0: CourseData, _1: RunnerParameters, extra: RaceParameters) => extra.grade),
  weather: valueFilter(
    (_0: CourseData, _1: RunnerParameters, extra: RaceParameters) => extra.weather,
  ),
  season: valueFilter(
    (_0: CourseData, _1: RunnerParameters, extra: RaceParameters) => extra.season,
  ),
  time: valueFilter(
    (_0: CourseData, _1: RunnerParameters, extra: RaceParameters) => extra.timeOfDay,
  ),
  motivation: valueFilter(
    (_0: CourseData, _1: RunnerParameters, extra: RaceParameters) => extra.mood + 3,
  ), // go from -2 to 2 to 1-5 scale
  popularity: noopImmediate,
};
