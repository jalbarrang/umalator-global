import { ISkillType } from '@/lib/sunday-tools/skills/definitions';
import skillsJson from './skills.json';
import type { SkillAlternative } from '@/lib/sunday-tools/skills/skill.types';

// =======
// Types
// =======

export type SkillSource = 'master' | 'gametora';

export type SkillGeneVersionEntry = {
  id: number;
};

export type SkillEntry = {
  id: string;
  rarity: number;
  alternatives: Array<SkillAlternative>;
  groupId: number;
  iconId: string;
  baseCost: number;
  order: number;
  name: string;
  source?: SkillSource;
  /**
   * Associated character source ids for this skill.
   * Unique skills use owning uma outfit ids; other skills default to an empty array until
   * broader uma/support-card source extraction is added.
   */
  character: Array<number>;
  gene_version?: SkillGeneVersionEntry;
};

export type SkillsMap = Record<string, SkillEntry>;

// =======
// Data
// =======

export const skills = skillsJson as SkillsMap;

// ============
// Utils
// ===========

export const skillComparator = (a: string, b: string): number => {
  const x = skills[a].order;
  const y = skills[b].order;

  return +(y < x) - +(x < y) || +(b < a) - +(a < b);
};

export const translateSkillNamesForLang = (lang: 'en' | 'ja'): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(skillsJson)) {
    // Names from master are currently English-only; for now JA falls back to EN.
    if (lang === 'en' || lang === 'ja') {
      result[key] = value.name;
    }
  }

  return result;
};

// =====
// Query Methods
// =====

export const getSkills = (): Array<SkillEntry> => Object.values(skills);

export const getSkillById = (id: string): SkillEntry | undefined => {
  const skill = skills[id];

  return skill;
};
export const getManySkills = (ids: Array<string>): Array<SkillEntry> => {
  const result: Array<SkillEntry> = [];
  for (let i = 0; i < ids.length; i++) {
    const skill = skills[ids[i]];

    if (skill !== undefined) {
      result.push(skill);
    }
  }

  return result;
};
export const getSkillAlternativesById = (id: string): Array<SkillAlternative> => {
  const skill = skills[id];

  if (skill === undefined) {
    return [];
  }

  return skill.alternatives;
};

export const getSkillsByIconType = (iconType: string): Array<SkillEntry> => {
  const result: Array<SkillEntry> = [];
  const skillsArray = getSkills();

  for (let i = 0; i < skillsArray.length; i++) {
    const skill = skillsArray[i];
    if (skill.iconId.startsWith(iconType)) {
      result.push(skill);
    }
  }

  return result;
};

export const getSkillsByGroupId = (groupId: number): Array<SkillEntry> => {
  const result: Array<SkillEntry> = [];
  const skillsArray = getSkills();

  for (let i = 0; i < skillsArray.length; i++) {
    const skill = skillsArray[i];
    if (skill.groupId === groupId) {
      result.push(skill);
    }
  }

  return result;
};

export const getSkillsByRarity = (rarity: number): Array<SkillEntry> => {
  const result: Array<SkillEntry> = [];
  const skillsArray = getSkills();

  for (let i = 0; i < skillsArray.length; i++) {
    const skill = skillsArray[i];
    if (skill.rarity === rarity) {
      result.push(skill);
    }
  }

  return result;
};

export const getSkillsByEffectType = (effectType: ISkillType): Array<SkillEntry> => {
  const result: Array<SkillEntry> = [];
  const skillsArray = getSkills();

  for (let i = 0; i < skillsArray.length; i++) {
    const skill = skillsArray[i];
    const alternatives = skill.alternatives;

    for (let j = 0; j < alternatives.length; j++) {
      const alternative = alternatives[j];
      if (alternative.effects.some((effect) => effect.type === effectType)) {
        result.push(skill);
      }
    }
  }

  return result;
};
