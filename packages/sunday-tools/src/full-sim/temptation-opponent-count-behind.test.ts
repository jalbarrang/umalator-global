import { describe, expect, it } from 'vitest';
import type { Runner } from '../common/runner';
import { getDynamicCondition } from './dynamic-conditions';
import { registerStateConditions } from './state-conditions';

registerStateConditions();

type FakeRunner = {
  id: number;
  finished: boolean;
  isRushed: boolean;
  position: number;
  race: { runners: Map<number, FakeRunner> };
};

function buildField(self: Partial<FakeRunner>, others: Array<Partial<FakeRunner>>): Runner {
  const runners = new Map<number, FakeRunner>();
  const selfRunner: FakeRunner = {
    id: 0,
    finished: false,
    isRushed: false,
    position: 500,
    race: { runners },
    ...self
  };
  selfRunner.race = { runners };
  runners.set(selfRunner.id, selfRunner);

  others.forEach((other, index) => {
    const runner: FakeRunner = {
      id: index + 1,
      finished: false,
      isRushed: false,
      position: 0,
      race: { runners },
      ...other
    };
    runner.race = { runners };
    runners.set(runner.id, runner);
  });

  return selfRunner as unknown as Runner;
}

describe('temptation_opponent_count_behind dynamic condition', () => {
  it('is registered', () => {
    expect(getDynamicCondition('temptation_opponent_count_behind')).toBeDefined();
  });

  it('counts distracted opponents positioned behind the runner', () => {
    const predicate = getDynamicCondition('temptation_opponent_count_behind')!(1, 'gte');
    const self = buildField({ position: 500 }, [
      { position: 300, isRushed: true }, // behind + rushed -> counts
      { position: 700, isRushed: true }, // ahead -> ignored
      { position: 200, isRushed: false } // behind but not rushed -> ignored
    ]);

    expect(predicate(self)).toBe(true);
  });

  it('is false when no distracted opponents are behind', () => {
    const predicate = getDynamicCondition('temptation_opponent_count_behind')!(1, 'gte');
    const self = buildField({ position: 500 }, [{ position: 700, isRushed: true }]);

    expect(predicate(self)).toBe(false);
  });
});
