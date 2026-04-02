import { describe, expect, it } from 'vitest';
import { createPlannerCompareSettings } from './skill-planner-compare';

describe('createPlannerCompareSettings', () => {
  it('enables health system and forwards overrides when stamina is accounted for', () => {
    const settings = createPlannerCompareSettings(false, { '100001': 0.25 });

    expect(settings.healthSystem).toBe(true);
    expect(settings.staminaDrainOverrides).toEqual({ '100001': 0.25 });
  });

  it('disables health system and clears overrides when stamina is ignored', () => {
    const settings = createPlannerCompareSettings(true, { '100001': 0.25 });

    expect(settings.healthSystem).toBe(false);
    expect(settings.staminaDrainOverrides).toEqual({});
  });
});
