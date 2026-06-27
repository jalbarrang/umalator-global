import { describe, expect, it } from 'vitest';
import type { Runner } from '../common/runner';
import { getDynamicCondition } from './dynamic-conditions';
import { registerStateConditions } from './state-conditions';

registerStateConditions();

const TARGET_SPEED = 27;

type FakeRunner = {
  id: number;
  finished: boolean;
  activatedAdvantageEffectTypes: Set<number>;
  race: { runners: Map<number, FakeRunner> };
};

function buildField(others: Array<Partial<FakeRunner>>): Runner {
  const self: FakeRunner = {
    id: 0,
    finished: false,
    activatedAdvantageEffectTypes: new Set(),
    race: { runners: new Map() }
  };
  const runners = self.race.runners;
  runners.set(self.id, self);

  for (const [index, other] of others.entries()) {
    const runner: FakeRunner = {
      id: index + 1,
      finished: other.finished ?? false,
      activatedAdvantageEffectTypes: other.activatedAdvantageEffectTypes ?? new Set(),
      race: self.race
    };
    runners.set(runner.id, runner);
  }

  return self as unknown as Runner;
}

describe('is_other_character_activate_advantage_skill dynamic condition', () => {
  it('is registered', () => {
    expect(getDynamicCondition('is_other_character_activate_advantage_skill')).toBeDefined();
  });

  it('is true when another active runner activated a matching advantage skill', () => {
    const predicate = getDynamicCondition('is_other_character_activate_advantage_skill')!(
      TARGET_SPEED,
      'eq'
    );
    const self = buildField([{ activatedAdvantageEffectTypes: new Set([TARGET_SPEED]) }]);

    expect(predicate(self)).toBe(true);
  });

  it('ignores the runner itself and non-matching effect types', () => {
    const predicate = getDynamicCondition('is_other_character_activate_advantage_skill')!(
      TARGET_SPEED,
      'eq'
    );
    const self = buildField([{ activatedAdvantageEffectTypes: new Set([9]) }]);
    (self as unknown as FakeRunner).activatedAdvantageEffectTypes.add(TARGET_SPEED);

    expect(predicate(self)).toBe(false);
  });

  it('ignores finished runners', () => {
    const predicate = getDynamicCondition('is_other_character_activate_advantage_skill')!(
      TARGET_SPEED,
      'eq'
    );
    const self = buildField([
      { finished: true, activatedAdvantageEffectTypes: new Set([TARGET_SPEED]) }
    ]);

    expect(predicate(self)).toBe(false);
  });
});
