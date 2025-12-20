/**
 * Types for runner data lookups and search functionality
 */

/** Skill lookup entry from the skill database */
export interface SkillLookupEntry {
  id: string;
  geneId?: string;
  name: string;
  rarity: number;
}

/** Uma lookup entry from the uma database */
export interface UmaLookupEntry {
  outfitId: string;
  outfitName: string;
  umaName: string;
}

/** Uma data structure from umas.json */
export interface UmaData {
  name: Array<string>;
  outfits: Record<string, string>;
}

/** Result of a skill search match */
export interface SkillMatch {
  id: string;
  geneId?: string;
  name: string;
  confidence: number;
  originalText: string;
}

/** Result of an uma search match */
export interface UmaMatch {
  outfitId: string;
  outfitName: string;
  umaName: string;
  confidence: number;
}
