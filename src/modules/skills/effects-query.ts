import { SkillActivation, SkillActivationMap } from '@simulation/compare.types';
import {
  SkillPerspective,
  SkillTarget,
  SkillType,
} from '@simulation/lib/race-solver/types';

export class EffectQuery {
  private activations: SkillActivationMap;
  private flatList: SkillActivation[];

  private constructor(activations: SkillActivationMap) {
    this.activations = activations;
    this.flatList = Array.from(activations.values()).flat();
  }

  static from(activations: SkillActivationMap): EffectQuery {
    return new EffectQuery(activations);
  }

  toList(): SkillActivation[] {
    return this.flatList;
  }

  toIds(): string[] {
    return Array.from(this.activations.keys());
  }

  // Count actual activations (not effects)
  countActivations(): number {
    return this.flatList.length;
  }

  // Filter methods become clearer
  getSelfBuffs(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Self &&
        a.effectTarget === SkillTarget.Self,
    );
  }

  getDebuffs(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective !== SkillPerspective.Self &&
        a.effectTarget !== SkillTarget.Self,
    );
  }

  getStaminaDebuffs(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Other &&
        a.effectTarget !== SkillTarget.Self &&
        a.effectType === SkillType.Recovery,
    );
  }

  // Get all effects from a specific activation
  getEffectsForExecution(executionId: string): SkillActivation[] {
    return this.flatList.filter((a) => a.executionId === executionId);
  }

  getSelfHeals(): SkillActivation[] {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Self &&
        a.effectType === SkillType.Recovery,
    );
  }
}
