import { Strategy } from '../runner/definitions';
import { Acceleration, Speed } from '../shared/definitions';

const START_DASH_INITIAL_SPEED = 3.0;
const START_DASH_BOOST = 24.0;

export function analyticalPacerPosition(
  courseDistance: number,
  baseSpeed: number,
  accumulatedTime: number,
): number {
  if (courseDistance <= 0 || baseSpeed <= 0 || accumulatedTime <= 0) {
    return 0;
  }

  const dashAcceleration =
    START_DASH_BOOST * Acceleration.StrategyPhaseCoefficient[Strategy.FrontRunner][0];
  const dashMaxSpeed = 0.85 * baseSpeed;
  const timeToDashMaxSpeed =
    dashAcceleration > 0
      ? Math.max(0, (dashMaxSpeed - START_DASH_INITIAL_SPEED) / dashAcceleration)
      : 0;

  if (accumulatedTime <= timeToDashMaxSpeed) {
    return (
      START_DASH_INITIAL_SPEED * accumulatedTime + 0.5 * dashAcceleration * accumulatedTime ** 2
    );
  }

  let position =
    START_DASH_INITIAL_SPEED * timeToDashMaxSpeed +
    0.5 * dashAcceleration * timeToDashMaxSpeed ** 2;
  let remainingTime = accumulatedTime - timeToDashMaxSpeed;

  const phase1Start = courseDistance / 6;
  const phase2Start = (courseDistance * 2) / 3;
  const earlySpeed = baseSpeed * Speed.StrategyPhaseCoefficient[Strategy.FrontRunner][0];
  const midSpeed = baseSpeed * Speed.StrategyPhaseCoefficient[Strategy.FrontRunner][1];
  const lateSpeed = baseSpeed * Speed.StrategyPhaseCoefficient[Strategy.FrontRunner][2];

  while (remainingTime > 0) {
    let phaseEnd = Number.POSITIVE_INFINITY;
    let speed = lateSpeed;

    if (position < phase1Start) {
      phaseEnd = phase1Start;
      speed = earlySpeed;
    } else if (position < phase2Start) {
      phaseEnd = phase2Start;
      speed = midSpeed;
    }

    if (speed <= 0) {
      return position;
    }

    const distanceToPhaseEnd = phaseEnd - position;
    const timeToPhaseEnd = distanceToPhaseEnd / speed;

    if (!Number.isFinite(timeToPhaseEnd) || remainingTime < timeToPhaseEnd) {
      position += speed * remainingTime;
      break;
    }

    position = phaseEnd;
    remainingTime -= timeToPhaseEnd;
  }

  return position;
}
