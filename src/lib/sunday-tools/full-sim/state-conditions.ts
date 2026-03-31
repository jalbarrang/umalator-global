import { Strategy } from '../runner/definitions';
import { StrategyHelpers } from '../runner/runner.types';
import type { Runner } from '../common/runner';
import type { IStrategy } from '../runner/definitions';
import { compare, registerDynamicCondition } from './dynamic-conditions';

const POPULARITY_ONE_GATE = 0;

function asNumericBoolean(value: boolean): number {
  return value ? 1 : 0;
}

function forEachActiveRunner(
  runner: Runner,
  includeSelf: boolean,
  callback: (other: Runner) => void,
): void {
  for (const other of runner.race.runners.values()) {
    if (other.finished) {
      continue;
    }

    if (!includeSelf && other.id === runner.id) {
      continue;
    }

    callback(other);
  }
}

function countActiveRushedRunners(
  runner: Runner,
  predicate?: (other: Runner) => boolean,
  includeSelf = true,
): number {
  let count = 0;

  forEachActiveRunner(runner, includeSelf, (other) => {
    if (!other.isRushed) {
      return;
    }

    if (predicate && !predicate(other)) {
      return;
    }

    count += 1;
  });

  return count;
}

function countActiveDuelingRunners(runner: Runner): number {
  let count = 0;

  forEachActiveRunner(runner, true, (other) => {
    if (other.isDueling) {
      count += 1;
    }
  });

  return count;
}

function hasSameStyleAsPopularityOneRunner(runner: Runner): boolean {
  const popularityOneRunner = Array.from(runner.race.runners.values()).find(
    (other) => !other.finished && other.gate === POPULARITY_ONE_GATE,
  );

  if (!popularityOneRunner) {
    return false;
  }

  return StrategyHelpers.strategyMatches(runner.strategy, popularityOneRunner.strategy);
}

function registerStyleTemptationCountCondition(name: string, strategy: IStrategy): void {
  registerDynamicCondition(name, (arg, cmp) => (runner) => {
    const count = countActiveRushedRunners(
      runner,
      (other) => StrategyHelpers.strategyMatches(other.strategy, strategy),
      true,
    );
    return compare(count, arg, cmp);
  });
}

export function registerStateConditions(): void {
  registerDynamicCondition('is_temptation', (arg, cmp) => (runner) => {
    return compare(asNumericBoolean(runner.isRushed), arg, cmp);
  });

  registerDynamicCondition('temptation_count', (arg, cmp) => (runner) => {
    return compare(countActiveRushedRunners(runner), arg, cmp);
  });

  registerDynamicCondition('temptation_count_behind', (arg, cmp) => (runner) => {
    const countBehind = countActiveRushedRunners(
      runner,
      (other) => other.position < runner.position,
      false,
    );
    return compare(countBehind, arg, cmp);
  });

  registerDynamicCondition('temptation_count_infront', (arg, cmp) => (runner) => {
    const countInfront = countActiveRushedRunners(
      runner,
      (other) => other.position > runner.position,
      false,
    );
    return compare(countInfront, arg, cmp);
  });

  registerStyleTemptationCountCondition('running_style_temptation_count_nige', Strategy.FrontRunner);
  registerStyleTemptationCountCondition('running_style_temptation_count_senko', Strategy.PaceChaser);
  registerStyleTemptationCountCondition('running_style_temptation_count_sashi', Strategy.LateSurger);
  registerStyleTemptationCountCondition('running_style_temptation_count_oikomi', Strategy.EndCloser);

  registerDynamicCondition('running_style_equal_popularity_one', (arg, cmp) => (runner) => {
    return compare(asNumericBoolean(hasSameStyleAsPopularityOneRunner(runner)), arg, cmp);
  });

  registerDynamicCondition('compete_fight_count', (arg, cmp) => (runner) => {
    return compare(countActiveDuelingRunners(runner), arg, cmp);
  });
}
