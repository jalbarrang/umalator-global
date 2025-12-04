/**
 * Types specific to OCR extraction
 */

import type { SkillMatch } from '@/modules/runners/data/types';

/** Extracted skill with image source tracking */
export interface ExtractedSkill extends SkillMatch {
  fromImage: number;
}

/** Complete extracted data from OCR processing */
export interface ExtractedUmaData {
  // Uma identity
  outfitId?: string;
  outfitName?: string;
  umaName?: string;
  umaConfidence: number;

  // Stats
  speed?: number;
  stamina?: number;
  power?: number;
  guts?: number;
  wisdom?: number;

  // Skills
  skills: ExtractedSkill[];

  // Metadata
  imageCount: number;
  unrecognized: string[];
}

