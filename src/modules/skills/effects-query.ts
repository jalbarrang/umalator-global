import type { SkillActivation, SkillActivationMap } from '@/modules/simulation/compare.types';
import {
  SkillPerspective,
  SkillTarget,
  SkillType,
} from '@/modules/simulation/lib/skills/definitions';

export class EffectQuery {
  private activations: SkillActivationMap;
  private flatList: Array<SkillActivation>;

  private constructor(activations: SkillActivationMap) {
    this.activations = activations;
    this.flatList = Array.from(activations.values()).flat();
  }

  static from(activations: SkillActivationMap): EffectQuery {
    return new EffectQuery(activations);
  }

  toList(): Array<SkillActivation> {
    return this.flatList;
  }

  toIds(): Array<string> {
    return Array.from(this.activations.keys());
  }

  // Count actual activations (not effects)
  countActivations(): number {
    return this.flatList.length;
  }

  // Filter methods become clearer
  getSelfBuffs(): Array<SkillActivation> {
    return this.flatList.filter(
      (a) => a.perspective === SkillPerspective.Self && a.effectTarget === SkillTarget.Self,
    );
  }

  getDebuffs(): Array<SkillActivation> {
    return this.flatList.filter(
      (a) => a.perspective !== SkillPerspective.Self && a.effectTarget !== SkillTarget.Self,
    );
  }

  getStaminaDebuffs(): Array<SkillActivation> {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Other &&
        a.effectTarget !== SkillTarget.Self &&
        a.effectType === SkillType.Recovery,
    );
  }

  // Get all effects from a specific activation
  getEffectsForExecution(executionId: string): Array<SkillActivation> {
    return this.flatList.filter((a) => a.executionId === executionId);
  }

  getSelfHeals(): Array<SkillActivation> {
    return this.flatList.filter(
      (a) => a.perspective === SkillPerspective.Self && a.effectType === SkillType.Recovery,
    );
  }
}
