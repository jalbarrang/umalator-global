import type { Runner } from '../common/runner';
import type { RunnerSnapshot } from '../common/race';
import { compare, registerDynamicCondition } from './dynamic-conditions';

const NEAR_DISTANCE_METERS = 3.0;
const BASHIN_METERS = 2.5;
const NEAR_COUNT_LANE_MULTIPLIER = 3.0;
const SURROUNDED_LANE_MULTIPLIER = 1.0;
const NEAR_LANE_TIME_LANE_MULTIPLIER = 1.0;
const VISIBLE_DISTANCE_METERS = 20.0;
const VISIBLE_LANE_MULTIPLIER = 11.5;

function asNumericBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function getLaneThreshold(runner: Runner, multiplier: number): number {
  return runner.race.course.horseLane * multiplier;
}

function isWithinDistance(
  runner: Runner,
  otherSnapshot: RunnerSnapshot,
  maxDistanceMeters: number,
): boolean {
  return Math.abs(otherSnapshot.position - runner.position) <= maxDistanceMeters;
}

function isWithinLane(
  runner: Runner,
  otherSnapshot: RunnerSnapshot,
  laneThreshold: number,
): boolean {
  return Math.abs(otherSnapshot.currentLane - runner.currentLane) <= laneThreshold;
}

function isAheadOf(runner: Runner, otherSnapshot: RunnerSnapshot): boolean {
  return otherSnapshot.position > runner.position;
}

function isBehindOf(runner: Runner, otherSnapshot: RunnerSnapshot): boolean {
  return otherSnapshot.position < runner.position;
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

function getNearestRunnerBehind(runner: Runner): RunnerSnapshot | undefined {
  let nearest: RunnerSnapshot | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  forEachActiveOtherSnapshot(runner, (snapshot) => {
    if (!isBehindOf(runner, snapshot)) {
      return;
    }

    const distance = runner.position - snapshot.position;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = snapshot;
    }
  });

  return nearest;
}

function getNearestRunnerInfront(runner: Runner): RunnerSnapshot | undefined {
  let nearest: RunnerSnapshot | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  forEachActiveOtherSnapshot(runner, (snapshot) => {
    if (!isAheadOf(runner, snapshot)) {
      return;
    }

    const distance = snapshot.position - runner.position;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = snapshot;
    }
  });

  return nearest;
}

function hasNearLaneRunnerInDirection(runner: Runner, direction: 'behind' | 'infront'): boolean {
  const laneThreshold = getLaneThreshold(runner, NEAR_LANE_TIME_LANE_MULTIPLIER);

  let hasMatch = false;
  forEachActiveOtherSnapshot(runner, (snapshot) => {
    if (hasMatch) {
      return;
    }

    const inDirection =
      direction === 'behind' ? isBehindOf(runner, snapshot) : isAheadOf(runner, snapshot);
    if (!inDirection) {
      return;
    }

    if (
      isWithinDistance(runner, snapshot, NEAR_DISTANCE_METERS) &&
      isWithinLane(runner, snapshot, laneThreshold)
    ) {
      hasMatch = true;
    }
  });

  return hasMatch;
}

function registerNearLaneTimeCondition(name: string, direction: 'behind' | 'infront'): void {
  registerDynamicCondition(name, (arg, cmp) => (runner) => {
    const isNearLane = hasNearLaneRunnerInDirection(runner, direction);
    const proxyTimeSeconds = isNearLane ? runner.accumulateTime.t : 0;
    return compare(proxyTimeSeconds, arg, cmp);
  });
}

export function registerProximityConditions(): void {
  registerDynamicCondition('near_count', (arg, cmp) => (runner) => {
    const laneThreshold = getLaneThreshold(runner, NEAR_COUNT_LANE_MULTIPLIER);
    let nearbyRunnerCount = 0;

    forEachActiveOtherSnapshot(runner, (snapshot) => {
      if (
        isWithinDistance(runner, snapshot, NEAR_DISTANCE_METERS) &&
        isWithinLane(runner, snapshot, laneThreshold)
      ) {
        nearbyRunnerCount += 1;
      }
    });

    return compare(nearbyRunnerCount, arg, cmp);
  });

  registerDynamicCondition('is_surrounded', (arg, cmp) => (runner) => {
    const laneThreshold = getLaneThreshold(runner, SURROUNDED_LANE_MULTIPLIER);
    let hasNearbyAheadRunner = false;
    let hasNearbyBehindRunner = false;

    forEachActiveOtherSnapshot(runner, (snapshot) => {
      if (
        !isWithinDistance(runner, snapshot, NEAR_DISTANCE_METERS) ||
        !isWithinLane(runner, snapshot, laneThreshold)
      ) {
        return;
      }

      if (isAheadOf(runner, snapshot)) {
        hasNearbyAheadRunner = true;
      } else if (isBehindOf(runner, snapshot)) {
        hasNearbyBehindRunner = true;
      }
    });

    return compare(asNumericBoolean(hasNearbyAheadRunner && hasNearbyBehindRunner), arg, cmp);
  });

  registerDynamicCondition('bashin_diff_behind', (arg, cmp) => (runner) => {
    const nearestBehind = getNearestRunnerBehind(runner);
    if (!nearestBehind) {
      return false;
    }

    const bashinDiff = (runner.position - nearestBehind.position) / BASHIN_METERS;
    return compare(bashinDiff, arg, cmp);
  });

  registerDynamicCondition('bashin_diff_infront', (arg, cmp) => (runner) => {
    const nearestInfront = getNearestRunnerInfront(runner);
    if (!nearestInfront) {
      return false;
    }

    const bashinDiff = (nearestInfront.position - runner.position) / BASHIN_METERS;
    return compare(bashinDiff, arg, cmp);
  });

  registerNearLaneTimeCondition('behind_near_lane_time', 'behind');
  registerNearLaneTimeCondition('behind_near_lane_time_set1', 'behind');
  registerNearLaneTimeCondition('infront_near_lane_time', 'infront');

  registerDynamicCondition('visiblehorse', (arg, cmp) => (runner) => {
    const laneThreshold = getLaneThreshold(runner, VISIBLE_LANE_MULTIPLIER);
    let visibleHorseCount = 0;

    forEachActiveOtherSnapshot(runner, (snapshot) => {
      const longitudinalDistance = snapshot.position - runner.position;
      if (longitudinalDistance < 0 || longitudinalDistance > VISIBLE_DISTANCE_METERS) {
        return;
      }

      if (isWithinLane(runner, snapshot, laneThreshold)) {
        visibleHorseCount += 1;
      }
    });

    return compare(visibleHorseCount, arg, cmp);
  });
}
