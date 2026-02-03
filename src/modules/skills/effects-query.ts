import type { SkillEffectLog, SkillActivationMap } from '@/modules/simulation/compare.types';
import {
  SkillPerspective,
  SkillTarget,
  SkillType,
} from '@/modules/simulation/lib/skills/definitions';

export class EffectQuery {
  private activations: SkillActivationMap;
  private flatList: Array<SkillEffectLog>;

  private constructor(activations: SkillActivationMap) {
    this.activations = activations;
    this.flatList = Object.values(activations).flat();
  }

  static from(activations: SkillActivationMap): EffectQuery {
    return new EffectQuery(activations);
  }

  toList(): Array<SkillEffectLog> {
    return this.flatList;
  }

  toIds(): Array<string> {
    return Object.keys(this.activations);
  }

  // Count actual activations (not effects)
  countActivations(): number {
    return this.flatList.length;
  }

  // Filter methods become clearer
  getSelfBuffs(): Array<SkillEffectLog> {
    return this.flatList.filter(
      (a) => a.perspective === SkillPerspective.Self && a.effectTarget === SkillTarget.Self,
    );
  }

  getDebuffs(): Array<SkillEffectLog> {
    return this.flatList.filter(
      (a) => a.perspective !== SkillPerspective.Self && a.effectTarget !== SkillTarget.Self,
    );
  }

  getStaminaDebuffs(): Array<SkillEffectLog> {
    return this.flatList.filter(
      (a) =>
        a.perspective === SkillPerspective.Other &&
        a.effectTarget !== SkillTarget.Self &&
        a.effectType === SkillType.Recovery,
    );
  }

  // Get all effects from a specific activation
  getEffectsForExecution(executionId: string): Array<SkillEffectLog> {
    return this.flatList.filter((a) => a.executionId === executionId);
  }

  getSelfHeals(): Array<SkillEffectLog> {
    return this.flatList.filter(
      (a) => a.perspective === SkillPerspective.Self && a.effectType === SkillType.Recovery,
    );
  }
}
