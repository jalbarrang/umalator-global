import type { Runner } from '../common/runner';
import type { RunnerSnapshot } from '../common/race';
import { compare, registerDynamicCondition } from './dynamic-conditions';

const FRONT_BLOCK_DISTANCE_METERS = 5.0;
const FRONT_BLOCK_LANE_MULTIPLIER = 1.0;
const SIDE_BLOCK_DISTANCE_METERS = 3.0;
const SIDE_BLOCK_LANE_MULTIPLIER = 1.0;
const OVERTAKE_DISTANCE_METERS = 5.0;
const OVERTAKE_LANE_MULTIPLIER = 2.0;
const MOVING_LANE_EPSILON = 0.00001;

function asNumericBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function getLaneThreshold(runner: Runner, multiplier: number): number {
  return runner.race.course.horseLane * multiplier;
}

function forEachActiveOtherSnapshot(
  runner: Runner,
  callback: (snapshot: RunnerSnapshot, runnerId: number) => void,
): void {
  for (const [runnerId, snapshot] of runner.race.runnerSnapshots) {
    if (runnerId === runner.id) {
      continue;
    }

    callback(snapshot, runnerId);
  }
}

function hasFrontBlockingRunner(runner: Runner): boolean {
  const laneThreshold = getLaneThreshold(runner, FRONT_BLOCK_LANE_MULTIPLIER);
  let blocked = false;

  forEachActiveOtherSnapshot(runner, (snapshot) => {
    if (blocked) {
      return;
    }

    const distanceAhead = snapshot.position - runner.position;
    const laneDelta = Math.abs(snapshot.currentLane - runner.currentLane);
    blocked =
      distanceAhead > 0 &&
      distanceAhead <= FRONT_BLOCK_DISTANCE_METERS &&
      laneDelta <= laneThreshold;
  });

  return blocked;
}

function getSideBlockingState(runner: Runner): { leftBlocked: boolean; rightBlocked: boolean } {
  const laneThreshold = getLaneThreshold(runner, SIDE_BLOCK_LANE_MULTIPLIER);
  let leftBlocked = false;
  let rightBlocked = false;

  forEachActiveOtherSnapshot(runner, (snapshot) => {
    const laneDelta = snapshot.currentLane - runner.currentLane;
    const distanceDelta = Math.abs(snapshot.position - runner.position);

    if (
      Math.abs(laneDelta) > laneThreshold ||
      Math.abs(laneDelta) < MOVING_LANE_EPSILON ||
      distanceDelta > SIDE_BLOCK_DISTANCE_METERS
    ) {
      return;
    }

    if (laneDelta < 0) {
      leftBlocked = true;
    } else {
      rightBlocked = true;
    }
  });

  return { leftBlocked, rightBlocked };
}

function hasSideBlockingRunner(runner: Runner): boolean {
  const { leftBlocked, rightBlocked } = getSideBlockingState(runner);
  return leftBlocked || rightBlocked;
}

function hasAllSideBlockingRunners(runner: Runner): boolean {
  const { leftBlocked, rightBlocked } = getSideBlockingState(runner);
  return leftBlocked && rightBlocked;
}

function isOvertakingRunner(runner: Runner): boolean {
  const laneThreshold = getLaneThreshold(runner, OVERTAKE_LANE_MULTIPLIER);
  let overtaking = false;

  forEachActiveOtherSnapshot(runner, (snapshot) => {
    if (overtaking) {
      return;
    }

    const isFaster = runner.currentSpeed > snapshot.currentSpeed;
    const distanceGap = Math.abs(snapshot.position - runner.position);
    const laneDelta = Math.abs(snapshot.currentLane - runner.currentLane);

    overtaking = isFaster && distanceGap <= OVERTAKE_DISTANCE_METERS && laneDelta <= laneThreshold;
  });

  return overtaking;
}

function registerContinuousTimeCondition(
  name: string,
  predicate: (runner: Runner) => boolean,
): void {
  registerDynamicCondition(name, (arg, cmp) => (runner) => {
    const proxyTimeSeconds = predicate(runner) ? runner.accumulateTime.t : 0;
    return compare(proxyTimeSeconds, arg, cmp);
  });
}

export function registerBlockingConditions(): void {
  registerDynamicCondition('blocked_front', (arg, cmp) => (runner) => {
    return compare(asNumericBoolean(hasFrontBlockingRunner(runner)), arg, cmp);
  });

  registerContinuousTimeCondition('blocked_front_continuetime', hasFrontBlockingRunner);

  registerContinuousTimeCondition(
    'blocked_all_continuetime',
    (runner) => hasFrontBlockingRunner(runner) && hasAllSideBlockingRunners(runner),
  );

  registerContinuousTimeCondition('blocked_side_continuetime', hasSideBlockingRunner);

  registerDynamicCondition('is_overtake', (arg, cmp) => (runner) => {
    return compare(asNumericBoolean(isOvertakingRunner(runner)), arg, cmp);
  });

  registerDynamicCondition('is_move_lane', (arg, cmp) => (runner) => {
    const isMovingLane = Math.abs(runner.laneChangeSpeed) > MOVING_LANE_EPSILON;
    return compare(asNumericBoolean(isMovingLane), arg, cmp);
  });

  registerContinuousTimeCondition('overtake_target_time', isOvertakingRunner);
  registerContinuousTimeCondition('overtake_target_no_order_up_time', isOvertakingRunner);
}
