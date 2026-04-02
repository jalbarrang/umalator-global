import { describe, expect, it } from 'vitest';
import { createSkillCompareSettings } from './skill-compare';

describe('createSkillCompareSettings', () => {
  it('keeps legacy default behavior when ignore flag is omitted', () => {
    const settings = createSkillCompareSettings({
      allowRushedUma1: false,
      allowRushedUma2: false,
      allowDownhillUma1: false,
      allowDownhillUma2: false,
      allowSectionModifierUma1: false,
      allowSectionModifierUma2: false,
      skillCheckChanceUma1: false,
      skillCheckChanceUma2: false,
    });

    expect(settings.healthSystem).toBe(false);
    expect(settings.staminaDrainOverrides).toEqual({});
  });

  it('enables health system and forwards overrides when ignore flag is false', () => {
    const settings = createSkillCompareSettings({
      allowRushedUma1: false,
      allowRushedUma2: false,
      allowDownhillUma1: false,
      allowDownhillUma2: false,
      allowSectionModifierUma1: false,
      allowSectionModifierUma2: false,
      skillCheckChanceUma1: false,
      skillCheckChanceUma2: false,
      ignoreStaminaConsumption: false,
      staminaDrainOverrides: { '100001': 0.35 },
    });

    expect(settings.healthSystem).toBe(true);
    expect(settings.staminaDrainOverrides).toEqual({ '100001': 0.35 });
  });
});
