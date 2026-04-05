/**
 * Types specific to OCR extraction
 */

import type { IStrategyName } from '@/lib/sunday-tools/runner/definitions';
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

  // Aptitudes and strategy
  surfaceAptitude?: string;
  distanceAptitude?: string;
  strategyAptitude?: string;
  strategy?: IStrategyName;

  // Skills
  skills: Array<ExtractedSkill>;

  // Metadata
  imageCount: number;
  unrecognized: Array<string>;
}
