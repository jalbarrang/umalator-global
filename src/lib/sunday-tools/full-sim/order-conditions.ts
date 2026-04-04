import type { Runner } from '../common/runner';
import { compare, registerDynamicCondition } from './dynamic-conditions';

const CONTINUE_GRACE_PERIOD_SECONDS = 5.0;

function getCurrentOrder(runner: Runner): number | undefined {
  return runner.race.runnerOrder.get(runner.id);
}

function getPreviousOrder(runner: Runner): number | undefined {
  return runner.race.previousRunnerOrder.get(runner.id);
}

function getNumUmas(runner: Runner): number {
  return runner.race.runners.size;
}

function getLeaderPosition(runner: Runner): number | undefined {
  let leaderId: number | undefined;

  for (const [id, order] of runner.race.runnerOrder.entries()) {
    if (order === 1) {
      leaderId = id;
      break;
    }
  }

  if (leaderId === undefined) {
    return undefined;
  }

  return runner.race.runners.get(leaderId)?.position;
}

function asNumericBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function registerOrderRateContinueCondition(name: string, rate: number, isInRate: boolean): void {
  registerDynamicCondition(name, (arg, cmp) => (runner) => {
    const order = getCurrentOrder(runner);
    if (order === undefined) {
      return false;
    }

    const threshold = Math.round(getNumUmas(runner) * rate);
    const withinRate = isInRate ? order <= threshold : order > threshold;
    const active = runner.accumulateTime.t > CONTINUE_GRACE_PERIOD_SECONDS && withinRate;

    return compare(asNumericBoolean(active), arg, cmp);
  });
}

function registerChangeOrderCondition(name: string): void {
  registerDynamicCondition(name, (arg, cmp) => (runner) => {
    const previousOrder = getPreviousOrder(runner);
    const currentOrder = getCurrentOrder(runner);
    if (previousOrder === undefined || currentOrder === undefined) {
      return false;
    }

    const improved = currentOrder < previousOrder;
    return compare(asNumericBoolean(improved), arg, cmp);
  });
}

export function registerOrderConditions(): void {
  registerDynamicCondition('order', (arg, cmp) => (runner) => {
    const order = getCurrentOrder(runner);
    if (order === undefined) {
      return false;
    }

    return compare(order, arg, cmp);
  });

  registerDynamicCondition('order_rate', (arg, cmp) => (runner) => {
    const order = getCurrentOrder(runner);
    if (order === undefined) {
      return false;
    }

    const orderAsPosition = Math.round(getNumUmas(runner) * (arg / 100));
    return compare(order, orderAsPosition, cmp);
  });

  registerOrderRateContinueCondition('order_rate_in20_continue', 0.2, true);
  registerOrderRateContinueCondition('order_rate_in40_continue', 0.4, true);
  registerOrderRateContinueCondition('order_rate_in50_continue', 0.5, true);
  registerOrderRateContinueCondition('order_rate_in80_continue', 0.8, true);

  registerOrderRateContinueCondition('order_rate_out20_continue', 0.2, false);
  registerOrderRateContinueCondition('order_rate_out40_continue', 0.4, false);
  registerOrderRateContinueCondition('order_rate_out50_continue', 0.5, false);
  registerOrderRateContinueCondition('order_rate_out70_continue', 0.7, false);

  registerDynamicCondition('change_order_onetime', (arg, cmp) => (runner) => {
    const previousOrder = getPreviousOrder(runner);
    const currentOrder = getCurrentOrder(runner);
    if (previousOrder === undefined || currentOrder === undefined) {
      return false;
    }

    const orderDelta = currentOrder - previousOrder;
    return compare(orderDelta, arg, cmp);
  });

  registerChangeOrderCondition('change_order_up_end_after');
  registerChangeOrderCondition('change_order_up_finalcorner_after');
  registerChangeOrderCondition('change_order_up_middle');

  registerDynamicCondition('distance_diff_top', (arg, cmp) => (runner) => {
    const leaderPosition = getLeaderPosition(runner);
    if (leaderPosition === undefined) {
      return false;
    }

    const diffMeters = Math.max(0, leaderPosition - runner.position);
    return compare(Math.floor(diffMeters), arg, cmp);
  });

  registerDynamicCondition('distance_diff_top_float', (arg, cmp) => (runner) => {
    const leaderPosition = getLeaderPosition(runner);
    if (leaderPosition === undefined) {
      return false;
    }

    const diffDecimeters = Math.max(0, (leaderPosition - runner.position) * 10);
    return compare(diffDecimeters, arg, cmp);
  });

  registerDynamicCondition('distance_diff_rate', (arg, cmp) => (runner) => {
    const leaderPosition = getLeaderPosition(runner);
    if (leaderPosition === undefined) {
      return false;
    }

    const distanceDiffRate =
      ((leaderPosition - runner.position) / runner.race.course.distance) * 100;
    return compare(distanceDiffRate, arg, cmp);
  });

  registerDynamicCondition('is_behind_in', (arg, cmp) => (runner) => {
    const order = getCurrentOrder(runner);
    if (order === undefined) {
      return false;
    }

    return compare(order, arg, cmp);
  });
}
