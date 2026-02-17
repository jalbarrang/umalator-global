import type { Runner } from '../common/runner';
import type { ActivationSamplePolicy } from './policies/ActivationSamplePolicy';
import type { Region, RegionList } from '../shared/region';
import type { ISkillRarity, ISkillTarget, ISkillType } from './definitions';
import type { Timer } from '../simulator.types';

export type DynamicCondition = (runner: Runner) => boolean;

export type SkillEffect = {
  target: ISkillTarget;
  type: ISkillType;
  baseDuration: number;
  modifier: number;
};

export type SkillTrigger = {
  skillId: string;
  // for some reason 1*/2* uniques, 1*/2* upgraded to 3*, and naturally 3* uniques all have different rarity (3, 4, 5 respectively)
  rarity: ISkillRarity;
  samplePolicy: ActivationSamplePolicy;
  regions: RegionList;
  effects: Array<SkillEffect>;
  extraCondition: DynamicCondition;
};

export type PendingSkill = {
  skillId: string;
  rarity: ISkillRarity;
  trigger: Region;
  effects: Array<SkillEffect>;
  extraCondition: DynamicCondition;
};

export type ActiveSkill = {
  skillId: string;
  durationTimer: Timer;
  modifier: number;
  effectTarget: ISkillTarget;
  effectType: ISkillType;
};

export type RawSkillEffect = {
  modifier: number;
  target: ISkillTarget;
  type: number;
};

export type SkillAlternative = {
  baseDuration: number;
  condition: string;
  precondition?: string;
  effects: Array<RawSkillEffect>;
};
