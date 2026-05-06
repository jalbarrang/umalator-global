import { describe, expect, it } from 'vitest';
import { dataRegistry } from '@/modules/data/registry';
import {
  getExternalDebuffEffects,
  isExternalDebuffEffect,
  isInjectableExternalDebuffSkill,
} from './external-debuffs';

describe('external debuff predicates', () => {
  it('accepts harmful external speed effects and rejects self-only effects', () => {
    expect(
      isExternalDebuffEffect({
        type: 21,
        target: 9,
        modifier: -500,
      }),
    ).toBe(true);

    expect(
      isExternalDebuffEffect({
        type: 21,
        target: 1,
        modifier: -500,
      }),
    ).toBe(false);
  });

  it('includes non-icon debuff skills when they have external harmful effects', () => {
    const keenEye = dataRegistry.skills.getById('200691');
    expect(keenEye).toBeDefined();
    expect(isInjectableExternalDebuffSkill(keenEye!)).toBe(true);
  });

  it('excludes self-curse skills and unsupported effect types', () => {
    const selfCurse = dataRegistry.skills.getById('200013');
    const unsupported = dataRegistry.skills.getById('201231');

    expect(selfCurse).toBeDefined();
    expect(unsupported).toBeDefined();
    expect(isInjectableExternalDebuffSkill(selfCurse!)).toBe(false);
    expect(isInjectableExternalDebuffSkill(unsupported!)).toBe(false);
  });

  it('filters mixed effects down to only external harmful ones', () => {
    const speedEater = dataRegistry.skills.getById('201082');
    if (!speedEater) throw new Error('speedEater not found');
    const effects = speedEater.alternatives.flatMap((alternative) => alternative.effects);
    const filtered = getExternalDebuffEffects(effects);

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((effect) => effect.target !== 1)).toBe(true);
    expect(filtered.every((effect) => effect.modifier < 0)).toBe(true);
  });
});
