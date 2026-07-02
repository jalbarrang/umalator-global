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
  callback: (other: Runner) => void
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
  includeSelf = true
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
    (other) => !other.finished && other.gate === POPULARITY_ONE_GATE
  );

  if (!popularityOneRunner) {
    return false;
  }

  return StrategyHelpers.strategyMatches(runner.strategy, popularityOneRunner.strategy);
}

function registerStyleTemptationCountCondition(
  name: string,
  strategy: IStrategy,
  includeSelf = true
): void {
  registerDynamicCondition(name, (arg, cmp) => (runner) => {
    const count = countActiveRushedRunners(
      runner,
      (other) => StrategyHelpers.strategyMatches(other.strategy, strategy),
      includeSelf
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

  const countRushedBehind = (runner: Runner) =>
    countActiveRushedRunners(runner, (other) => other.position < runner.position, false);

  registerDynamicCondition('temptation_count_behind', (arg, cmp) => (runner) => {
    return compare(countRushedBehind(runner), arg, cmp);
  });

  // Opponent-only variant; countActiveRushedRunners already excludes self.
  registerDynamicCondition('temptation_opponent_count_behind', (arg, cmp) => (runner) => {
    return compare(countRushedBehind(runner), arg, cmp);
  });

  const countRushedInFront = (runner: Runner) =>
    countActiveRushedRunners(runner, (other) => other.position > runner.position, false);

  registerDynamicCondition('temptation_count_infront', (arg, cmp) => (runner) => {
    return compare(countRushedInFront(runner), arg, cmp);
  });

  registerDynamicCondition('temptation_opponent_count_infront', (arg, cmp) => (runner) => {
    return compare(countRushedInFront(runner), arg, cmp);
  });

  registerStyleTemptationCountCondition(
    'running_style_temptation_count_nige',
    Strategy.FrontRunner
  );
  registerStyleTemptationCountCondition(
    'running_style_temptation_count_senko',
    Strategy.PaceChaser
  );
  registerStyleTemptationCountCondition(
    'running_style_temptation_count_sashi',
    Strategy.LateSurger
  );
  registerStyleTemptationCountCondition(
    'running_style_temptation_count_oikomi',
    Strategy.EndCloser
  );
  registerStyleTemptationCountCondition(
    'running_style_temptation_opponent_count_nige',
    Strategy.FrontRunner,
    false
  );
  registerStyleTemptationCountCondition(
    'running_style_temptation_opponent_count_senko',
    Strategy.PaceChaser,
    false
  );
  registerStyleTemptationCountCondition(
    'running_style_temptation_opponent_count_sashi',
    Strategy.LateSurger,
    false
  );
  registerStyleTemptationCountCondition(
    'running_style_temptation_opponent_count_oikomi',
    Strategy.EndCloser,
    false
  );

  registerDynamicCondition('running_style_equal_popularity_one', (arg, cmp) => (runner) => {
    return compare(asNumericBoolean(hasSameStyleAsPopularityOneRunner(runner)), arg, cmp);
  });

  registerDynamicCondition('compete_fight_count', (arg, cmp) => (runner) => {
    return compare(countActiveDuelingRunners(runner), arg, cmp);
  });

  // arg is the SkillType effect id the opponent's activated skill must carry.
  // The comparator is always ==N in the data, so we report whether any other
  // active runner has activated a positive effect of that type.
  registerDynamicCondition(
    'is_other_character_activate_advantage_skill',
    (effectType) => (runner) => {
      let activated = false;
      forEachActiveRunner(runner, false, (other) => {
        if (other.activatedAdvantageEffectTypes.has(effectType)) {
          activated = true;
        }
      });
      return activated;
    }
  );
}
