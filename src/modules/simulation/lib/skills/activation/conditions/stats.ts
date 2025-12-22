import { valueFilter } from '../helpers';
import type { CourseData, RaceParameters } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';

export const StatsConditions = {
  // NB. since skill conditions are processed before any skill activations, stats here are base stats (i.e. greens are not included)

  base_power: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) => horse.power,
  ),
  base_speed: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) => horse.speed,
  ),
  base_stamina: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) => horse.stamina,
  ),
  base_guts: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) => horse.guts,
  ),
  base_wiz: valueFilter(
    (_: CourseData, horse: RunnerParameters, _extra: RaceParameters) => horse.wisdom,
  ),
};
