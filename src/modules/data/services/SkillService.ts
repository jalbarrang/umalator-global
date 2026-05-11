import { ISkillType } from '@/lib/sunday-tools/skills/definitions';
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

export interface SkillLookupEntry {
  id: string;
  geneId?: string;
  name: string;
  rarity: number;
}

// =======
// Service
// =======

export class SkillService {
  private readonly skillCollection: SkillsMap;
  private skillLookup: Map<string, SkillLookupEntry> | null = null;
  private skillLookupCandidates: Map<string, Array<SkillLookupEntry>> | null = null;

  constructor(skillsData: SkillsMap) {
    this.skillCollection = skillsData;
  }

  // ============
  // Utils
  // ===========

  skillComparator = (a: string, b: string): number => {
    const x = this.skillCollection[a].order;
    const y = this.skillCollection[b].order;

    return +(y < x) - +(x < y) || +(b < a) - +(a < b);
  };

  translateSkillNamesForLang = (lang: 'en' | 'ja'): Record<string, string> => {
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(this.skillCollection)) {
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

  getAll = (): Array<SkillEntry> => Object.values(this.skillCollection);

  getById = (id: string): SkillEntry | undefined => {
    const skill = this.skillCollection[id];
    return skill;
  };

  getMany = (ids: Array<string>): Array<SkillEntry> => {
    const result: Array<SkillEntry> = [];
    for (let i = 0; i < ids.length; i++) {
      const skill = this.skillCollection[ids[i]];

      if (skill !== undefined) {
        result.push(skill);
      }
    }

    return result;
  };

  getAlternativesById = (id: string): Array<SkillAlternative> => {
    const skill = this.skillCollection[id];

    if (skill === undefined) {
      return [];
    }

    return skill.alternatives;
  };

  getByIconType = (iconType: string): Array<SkillEntry> => {
    const result: Array<SkillEntry> = [];
    const skillsArray = this.getAll();

    for (let i = 0; i < skillsArray.length; i++) {
      const skill = skillsArray[i];
      if (skill.iconId.startsWith(iconType)) {
        result.push(skill);
      }
    }

    return result;
  };

  getByGroupId = (groupId: number): Array<SkillEntry> => {
    const result: Array<SkillEntry> = [];
    const skillsArray = this.getAll();

    for (let i = 0; i < skillsArray.length; i++) {
      const skill = skillsArray[i];
      if (skill.groupId === groupId) {
        result.push(skill);
      }
    }

    return result;
  };

  getByRarity = (rarity: number): Array<SkillEntry> => {
    const result: Array<SkillEntry> = [];
    const skillsArray = this.getAll();

    for (let i = 0; i < skillsArray.length; i++) {
      const skill = skillsArray[i];
      if (skill.rarity === rarity) {
        result.push(skill);
      }
    }

    return result;
  };

  getByEffectType = (effectType: ISkillType): Array<SkillEntry> => {
    const result: Array<SkillEntry> = [];
    const skillsArray = this.getAll();

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

  getUniqueSkillIds = (): Array<string> => {
    const uniqueSkillRarities = [4, 5];
    const result: Array<string> = [];
    const skillsArray = this.getAll();

    for (let i = 0; i < skillsArray.length; i++) {
      const skill = skillsArray[i];
      if (skill.character?.length === 1 && uniqueSkillRarities.includes(skill.rarity)) {
        result.push(skill.id);
      }
    }

    return result;
  };

  getNonUniqueSkillIds = (): Array<string> => {
    const result: Array<string> = [];
    const skillsArray = this.getAll();

    for (let i = 0; i < skillsArray.length; i++) {
      const skill = skillsArray[i];
      if (skill.rarity < 3 || skill.rarity > 4) {
        result.push(skill.id);
      }
    }

    return result;
  };

  getNameById = (id: string): string => {
    return this.skillCollection[id].name;
  };

  normalizeSkillId = (skillId: string): string => {
    return skillId.split('-')[0] ?? skillId;
  };

  getNames = (): Array<string> => {
    return Object.values(this.skillCollection).map((skill) => skill.name);
  };

  findVersionOfSkill = (id: string, existingIds: Array<string>): string | undefined => {
    const skill = this.skillCollection[id];

    if (skill === undefined) {
      return undefined;
    }

    return skill.versions
      .map(String)
      .find((versionId) => versionId !== id && existingIds.includes(versionId));
  };

  // ============
  // OCR Matching
  // ============

  /**
   * Normalizes skill names for OCR matching while preserving skill-grade symbols.
   * Implements the same symbol handling used in uma-tools OCR matching.
   */
  normalizeSkillName = (value: string): string => {
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
      .replaceAll('©', '◎')
      .replaceAll('®', '○')
      .replace(/\b(?:lvl|level)\s*\d+\b/giu, ' ')
      .replace(/\s+[Oo0]$/u, '○')
      .replace(/\s+[Xx]$/u, '×')
      .toLowerCase()
      .replace(/[[\]\s\-_・!！?？,、.。:：;；'"""''「」『』【】()（）☆★]/gu, '')
      .trim();
  };

  private levenshteinDistance = (a: string, b: string): number => {
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

  private similarity = (a: string, b: string): number => {
    if (a === b) {
      return 1;
    }

    if (a.length === 0 || b.length === 0) {
      return 0;
    }

    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);

    return 1 - distance / maxLength;
  };

  private skillIdPrefixRank = (skillId: string): number => {
    const normalizedId = this.normalizeSkillId(skillId);
    const prefix = normalizedId.charAt(0);

    switch (prefix) {
      case '1':
        return 0;
      case '2':
        return 1;
      case '9':
        return 2;
      default:
        return 3;
    }
  };

  private sortSkillLookupEntries = (entries: Array<SkillLookupEntry>): Array<SkillLookupEntry> => {
    return [...entries].sort((a, b) => {
      const prefixRank = this.skillIdPrefixRank(a.id) - this.skillIdPrefixRank(b.id);
      if (prefixRank !== 0) {
        return prefixRank;
      }

      const rarityRank = b.rarity - a.rarity;
      if (rarityRank !== 0) {
        return rarityRank;
      }

      return a.id.localeCompare(b.id);
    });
  };

  private selectCanonicalSkillLookupEntry = (
    entries: Array<SkillLookupEntry>,
  ): SkillLookupEntry => {
    return this.sortSkillLookupEntries(entries)[0];
  };

  private hasSkillLevelIndicator = (value: string): boolean =>
    /\b(?:lvl|level)\s*\d+\b/iu.test(value);

  private selectMatchedSkillLookupEntry = (
    entries: Array<SkillLookupEntry>,
    originalText: string,
  ): SkillLookupEntry => {
    const hasLevel = this.hasSkillLevelIndicator(originalText);
    const sortedEntries = this.sortSkillLookupEntries(entries);

    if (hasLevel) {
      return (
        sortedEntries.find((entry) => this.normalizeSkillId(entry.id).startsWith('1')) ??
        sortedEntries[0]
      );
    }

    return (
      sortedEntries.find((entry) => this.normalizeSkillId(entry.id).startsWith('9')) ??
      sortedEntries[0]
    );
  };

  private buildSkillLookup = () => {
    if (this.skillLookup && this.skillLookupCandidates) {
      return;
    }

    this.skillLookup = new Map<string, SkillLookupEntry>();
    this.skillLookupCandidates = new Map<string, Array<SkillLookupEntry>>();

    for (const skill of Object.values(this.skillCollection)) {
      const key = this.normalizeSkillName(skill.name);

      if (!key) {
        continue;
      }

      const nextEntry: SkillLookupEntry = {
        id: `${skill.id}`,
        geneId: skill.gene_version?.id ? `${skill.gene_version.id}` : undefined,
        name: skill.name,
        rarity: skill.rarity,
      };

      const entries = this.skillLookupCandidates.get(key);
      if (entries) {
        if (!entries.some((entry) => entry.id === nextEntry.id)) {
          entries.push(nextEntry);
        }
        continue;
      }

      this.skillLookupCandidates.set(key, [nextEntry]);
    }

    for (const [key, entries] of this.skillLookupCandidates) {
      this.skillLookup.set(key, this.selectCanonicalSkillLookupEntry(entries));
    }
  };

  getSkillLookup = (): Map<string, SkillLookupEntry> => {
    this.buildSkillLookup();
    return this.skillLookup!;
  };

  getSkillLookupCandidates = (): Map<string, Array<SkillLookupEntry>> => {
    this.buildSkillLookup();
    return this.skillLookupCandidates!;
  };

  /** Find best skill match for OCR text */
  findBestSkillMatch = (ocrText: string): SkillMatch | null => {
    const lookupCandidates = this.getSkillLookupCandidates();
    const normalizedOcr = this.normalizeSkillName(ocrText);

    if (!normalizedOcr || normalizedOcr.length < 3) {
      return null;
    }

    const exactMatches = lookupCandidates.get(normalizedOcr);
    if (exactMatches && exactMatches.length > 0) {
      const exactMatch = this.selectMatchedSkillLookupEntry(exactMatches, ocrText);

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

    for (const [key, entries] of lookupCandidates) {
      let score = this.similarity(normalizedOcr, key);

      if (score < minThreshold && normalizedOcr.includes(key)) {
        score = 0.85;
      }

      if (score < minThreshold && key.includes(normalizedOcr) && normalizedOcr.length >= 5) {
        score = 0.75;
      }

      if (score > bestScore && score >= minThreshold) {
        const entry = this.selectMatchedSkillLookupEntry(entries, ocrText);

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

  resolveSkillId = (skillId: string, hasLevel: boolean): string => {
    if (hasLevel) {
      return skillId;
    }

    const skill = this.skillCollection[skillId];
    if (!skill?.gene_version?.id) {
      return skillId;
    }

    return `${skill.gene_version.id}`;
  };
}
