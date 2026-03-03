import { SkillTarget, SkillType } from './definitions';

type EffectLike = {
  type: number;
  target: number;
  modifier: number;
};

const EXTERNAL_DEBUFF_EFFECT_TYPES = new Set<number>([
  SkillType.Recovery,
  SkillType.CurrentSpeed,
  SkillType.CurrentSpeedWithNaturalDeceleration,
  SkillType.TargetSpeed,
  SkillType.Accel,
  SkillType.LaneMovementSpeed,
  SkillType.ChangeLane,
]);

type SkillWithAlternatives = {
  alternatives: Array<{
    effects: Array<EffectLike>;
  }>;
};

export function isExternalDebuffEffect(effect: EffectLike): boolean {
  if (effect.target === SkillTarget.Self) {
    return false;
  }

  if (!EXTERNAL_DEBUFF_EFFECT_TYPES.has(effect.type)) {
    return false;
  }

  return effect.modifier < 0;
}

export function getExternalDebuffEffects<T extends EffectLike>(effects: Array<T>): Array<T> {
  return effects.filter((effect) => isExternalDebuffEffect(effect));
}

export function isInjectableExternalDebuffSkill(skill: SkillWithAlternatives): boolean {
  return skill.alternatives.some((alternative) =>
    alternative.effects.some((effect) => isExternalDebuffEffect(effect)),
  );
}
