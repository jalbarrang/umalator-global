import { Speed } from "../../core/constants";
import type { IPhase } from "../../core/types";
import type { RunnerParameters } from "../../runner/types";

export function baseTargetSpeed(
  runner: RunnerParameters,
  courseBaseSpeed: number,
  phase: IPhase,
) {
  const phaseCoefficient =
    Speed.StrategyPhaseCoefficient[runner.strategy][phase];

  return (
    courseBaseSpeed * phaseCoefficient +
    (phase == 2
      ? Math.sqrt(500.0 * runner.speed) *
        Speed.DistanceProficiencyModifier[runner.distanceAptitude] *
        0.002
      : 0)
  );
}

export function lastSpurtSpeed(runner: RunnerParameters, courseBaseSpeed: number) {
  let v =
    (baseTargetSpeed(runner, courseBaseSpeed, 2) + 0.01 * courseBaseSpeed) *
      1.05 +
    Math.sqrt(500.0 * runner.speed) *
      Speed.DistanceProficiencyModifier[runner.distanceAptitude] *
      0.002;
  v += Math.pow(450.0 * runner.guts, 0.597) * 0.0001;
  return v;
}
