import type { IPhase } from '@/modules/simulation/lib/core/types';
import type { RunnerParameters } from '@/modules/simulation/lib/runner/types';
import { Acceleration, BaseAccel, UphillBaseAccel } from '@/modules/simulation/lib/core/constants';

/**
 * Calculates the base acceleration for a runner in a given race phase
 *
 * Formula:
 * Accel = BaseAcceleration * sqrt(500.0 * PowerStat) * StrategyPhaseCoefficient * GroundTypeProficiencyModifier * DistanceProficiencyModifier
 *
 * @param baseAcceleration - The base acceleration value (0.0006 for flat courses, 0.0004 for uphill courses)
 * @param runnerParameters - The runner parameters
 * @param racePhase - The race phase (0: Early-race, 1: Mid-race, 2: Late-race, 3: Last spurt)
 * @returns The resulting acceleration value
 */
export const calculateBaseAcceleration = (
  baseAcceleration: number,
  runnerParameters: RunnerParameters,
  racePhase: IPhase,
): number => {
  const strategyCoefficient =
    Acceleration.StrategyPhaseCoefficient[runnerParameters.strategy][racePhase];
  const groundTypeProficiencyModifier =
    Acceleration.GroundTypeProficiencyModifier[runnerParameters.surfaceAptitude];
  const distanceProficiencyModifier =
    Acceleration.DistanceProficiencyModifier[runnerParameters.distanceAptitude];

  return (
    baseAcceleration *
    Math.sqrt(500.0 * runnerParameters.power) *
    strategyCoefficient *
    groundTypeProficiencyModifier *
    distanceProficiencyModifier
  );
};

export const getBaseAccelForSlope = (isUphill: boolean = false): number => {
  return isUphill ? UphillBaseAccel : BaseAccel;
};
