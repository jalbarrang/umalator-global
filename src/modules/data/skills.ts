import { ISkillType } from '@/lib/sunday-tools/skills/definitions';
import skillsJson from './skills.json';
import type { SkillAlternative } from '@/lib/sunday-tools/skills/skill.types';
import type { SkillMatch } from '@/modules/runners/data/types';

// =======
// Types
// =======

export type SkillGeneVersionEntry = {
  id: number;
};

export type SkillEntry = {
  id: string;
  rarity: number;
  alternatives: Array<SkillAlternative>;
  groupId: number;
  versions: Array<number>;
  iconId: string;
  baseCost: number;
  order: number;
  name: string;
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

export const skillCollection = skillsJson as SkillsMap;

// ============
// Utils
// ===========

export const skillComparator = (a: string, b: string): number => {
  const x = skillCollection[a].order;
  const y = skillCollection[b].order;

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

export const getSkills = (): Array<SkillEntry> => Object.values(skillCollection);

export const getSkillById = (id: string): SkillEntry | undefined => {
  const skill = skillCollection[id];

  return skill;
};

export const getManySkills = (ids: Array<string>): Array<SkillEntry> => {
  const result: Array<SkillEntry> = [];
  for (let i = 0; i < ids.length; i++) {
    const skill = skillCollection[ids[i]];

    if (skill !== undefined) {
      result.push(skill);
    }
  }

  return result;
};

export const getSkillAlternativesById = (id: string): Array<SkillAlternative> => {
  const skill = skillCollection[id];

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

// ============
// Helper Methods
// ============

const uniqueSkillRarities = [4, 5];
export const getUniqueSkillIds = (): Array<string> => {
  const result: Array<string> = [];
  const skillsArray = getSkills();

  for (let i = 0; i < skillsArray.length; i++) {
    const skill = skillsArray[i];
    if (skill.character?.length === 1 && uniqueSkillRarities.includes(skill.rarity)) {
      result.push(skill.id);
    }
  }

  return result;
};

export const getNonUniqueSkillIds = (): Array<string> => {
  const result: Array<string> = [];
  const skillsArray = getSkills();

  for (let i = 0; i < skillsArray.length; i++) {
    const skill = skillsArray[i];
    if (skill.rarity < 3 || skill.rarity > 4) {
      result.push(skill.id);
    }
  }

  return result;
};

export const getSkillNameById = (id: string): string => {
  return skillCollection[id].name;
};

export const normalizeSkillId = (skillId: string): string => {
  return skillId.split('-')[0] ?? skillId;
};

export const getSkillNames = (): Array<string> => {
  return Object.values(skillCollection).map((skill) => skill.name);
};

export const findVersionOfSkill = (id: string, existingIds: Array<string>): string | undefined => {
  const skill = skillCollection[id];

  if (skill === undefined) {
    return undefined;
  }

  return skill.versions
    .map(String)
    .find((versionId) => versionId !== id && existingIds.includes(versionId));
};

export interface SkillLookupEntry {
  id: string;
  geneId?: string;
  name: string;
  rarity: number;
}

const skillLookup = new Map<string, SkillLookupEntry>();

/**
 * Normalizes skill names for OCR matching while preserving skill-grade symbols.
 * Implements the same symbol handling used in uma-tools OCR matching.
 */
export const normalizeSkillName = (value: string): string => {
  if (!value) {
    return '';
  }

  return value
    .normalize('NFKC')
    .replaceAll('◯', '○')
    .replaceAll('⭕', '○')
    .replaceAll('◦', '○')
    .replaceAll('⃝', '○')
    .replaceAll('⦿', '◎')
    .replaceAll('⊚', '◎')
    .replaceAll('✕', '×')
    .replaceAll('✖', '×')
    .replaceAll('©', '○')
    .replaceAll('®', '◎')
    .replace(/\b(?:lvl|level)\s*\d+\b/giu, ' ')
    .replace(/[Oo0]\s*$/u, '○')
    .replace(/[Xx]\s*$/u, '×')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}○◎×]/gu, '');
};

const levenshteinDistance = (a: string, b: string): number => {
  const matrix: Array<Array<number>> = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

const similarity = (a: string, b: string): number => {
  if (a === b) {
    return 1;
  }

  if (a.length === 0 || b.length === 0) {
    return 0;
  }

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);

  return 1 - distance / maxLength;
};

function buildSkillLookup() {
  if (skillLookup.size > 0) {
    return;
  }

  for (const skill of Object.values(skillCollection)) {
    const key = normalizeSkillName(skill.name);

    if (!key || skillLookup.has(key)) {
      continue;
    }

    skillLookup.set(key, {
      id: `${skill.id}`,
      geneId: skill.gene_version?.id ? `${skill.gene_version.id}` : undefined,
      name: skill.name,
      rarity: skill.rarity,
    });
  }
}

export const getSkillLookup = (): Map<string, SkillLookupEntry> => {
  buildSkillLookup();
  return skillLookup;
};

/** Find best skill match for OCR text */
export const findBestSkillMatch = (ocrText: string): SkillMatch | null => {
  const lookup = getSkillLookup();
  const normalizedOcr = normalizeSkillName(ocrText);

  if (!normalizedOcr || normalizedOcr.length < 3) {
    return null;
  }

  const exactMatch = lookup.get(normalizedOcr);
  if (exactMatch) {
    return {
      id: exactMatch.id,
      geneId: exactMatch.geneId,
      name: exactMatch.name,
      confidence: 1,
      originalText: ocrText,
    };
  }

  let bestMatch: SkillMatch | null = null;
  let bestScore = 0;
  const minThreshold = 0.55;

  for (const [key, entry] of lookup) {
    let score = similarity(normalizedOcr, key);

    if (score < minThreshold && normalizedOcr.includes(key)) {
      score = 0.85;
    }

    if (score < minThreshold && key.includes(normalizedOcr) && normalizedOcr.length >= 5) {
      score = 0.75;
    }

    if (score > bestScore && score >= minThreshold) {
      bestScore = score;
      bestMatch = {
        id: entry.id,
        geneId: entry.geneId,
        name: entry.name,
        confidence: score,
        originalText: ocrText,
      };
    }
  }

  return bestMatch;
};

export const resolveSkillId = (skillId: string, hasLevel: boolean): string => {
  if (hasLevel) {
    return skillId;
  }

  const skill = skillCollection[skillId];
  if (!skill?.gene_version?.id) {
    return skillId;
  }

  return `${skill.gene_version.id}`;
};
