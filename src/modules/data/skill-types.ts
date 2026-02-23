import type { SkillAlternative } from '@/lib/sunday-tools/skills/skill.types';

export type SkillSource = 'master' | 'gametora';

export type SkillEntry = {
  rarity: number;
  alternatives: Array<SkillAlternative>;
  groupId: number;
  iconId: string;
  baseCost: number;
  order: number;
  name: string;
  source?: SkillSource;
};

export type SkillsMap = Record<string, SkillEntry>;
