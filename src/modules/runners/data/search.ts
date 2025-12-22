/**
 * Search and lookup utilities for uma and skill data
 */

import umas from '@data/umas.json';
import GametoraSkills from '@data/gametora/skills.json';
import type { ISkill } from '@/modules/skills/types';
import type { SkillLookupEntry, SkillMatch, UmaData, UmaLookupEntry, UmaMatch } from './types';

// =============================================================================
// Text Normalization & Similarity
// =============================================================================

/** Normalize text for fuzzy matching */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[☆♪★♫◎○●◇◆■□▲△▼▽♠♣♥♦]/g, '') // Remove special game chars
    .replace(/[^\w\s]/g, ' ') // Replace other special chars with space
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/** Levenshtein distance for fuzzy matching */
export function levenshteinDistance(a: string, b: string): number {
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/** Calculate similarity ratio (0-1) */
export function similarity(a: string, b: string): number {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  if (normalizedA === normalizedB) return 1;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  return 1 - distance / maxLength;
}

// =============================================================================
// Skill Lookup
// =============================================================================

const skillLookup = new Map<string, SkillLookupEntry>();

function buildSkillLookup() {
  if (skillLookup.size > 0) return;

  for (const skill of GametoraSkills as Array<ISkill>) {
    const id = String(skill.id);

    // Add main skill name_en
    if (skill.name_en) {
      const key = normalize(skill.name_en);
      if (key && !skillLookup.has(key)) {
        skillLookup.set(key, {
          id,
          geneId: skill.gene_version?.id ? `${skill.gene_version.id}` : undefined,
          name: skill.name_en,
          rarity: skill.rarity,
        });
      }
    }
  }
}

/** Get the skill lookup map (ensures it's built) */
export function getSkillLookup(): Map<string, SkillLookupEntry> {
  buildSkillLookup();
  return skillLookup;
}

// =============================================================================
// Uma Lookup
// =============================================================================

const umaLookup = new Map<string, UmaLookupEntry>();

function buildUmaLookup() {
  if (umaLookup.size > 0) return;

  for (const [_baseId, uma] of Object.entries(umas) as Array<[string, UmaData]>) {
    const umaName = uma.name[1] || '';

    for (const [outfitId, outfitName] of Object.entries(uma.outfits)) {
      // Store with full combined key
      const combinedKey = normalize(outfitName + ' ' + umaName);
      umaLookup.set(combinedKey, { outfitId, outfitName, umaName });

      // Store with outfit name only
      // - With the outfit name you can get the uma name directly.
      const outfitOnly = normalize(outfitName);
      if (!umaLookup.has(outfitOnly)) {
        umaLookup.set(outfitOnly, { outfitId, outfitName, umaName });
      }
    }
  }
}

/** Get the uma lookup map (ensures it's built) */
export function getUmaLookup(): Map<string, UmaLookupEntry> {
  buildUmaLookup();
  return umaLookup;
}

// =============================================================================
// Search Functions
// =============================================================================

/** Find best skill match for OCR text */
export function findBestSkillMatch(ocrText: string): SkillMatch | null {
  const lookup = getSkillLookup();
  const normalizedOcr = normalize(ocrText);
  if (!normalizedOcr || normalizedOcr.length < 3) return null;

  // Exact match first
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

  // Fuzzy match with lower threshold (0.55 instead of 0.7)
  let bestMatch: SkillMatch | null = null;
  let bestScore = 0;
  const minThreshold = 0.55;

  for (const [key, entry] of lookup) {
    // Try direct similarity
    let score = similarity(normalizedOcr, key);

    // Also try checking if OCR text contains the skill name (substring match)
    if (score < minThreshold && normalizedOcr.includes(key)) {
      score = 0.85; // High confidence for substring match
    }

    // Also try if skill name contains OCR text (partial match)
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
}

/** Find best uma match from outfit and name */
export function findBestUmaMatch(outfit: string, umaName: string): UmaMatch | null {
  const lookup = getUmaLookup();
  const normalizedOutfit = normalize(outfit.replace(/[[\]]/g, ''));
  const normalizedUmaName = normalize(umaName);

  // Try combined match first
  const combinedKey = normalize(outfit + ' ' + umaName);
  const exactCombined = lookup.get(combinedKey);
  if (exactCombined) {
    return { ...exactCombined, confidence: 1 };
  }

  // Try outfit match
  if (normalizedOutfit) {
    const outfitMatch = lookup.get(normalizedOutfit);
    if (outfitMatch) {
      return { ...outfitMatch, confidence: 0.9 };
    }
  }

  // Try uma name match
  if (normalizedUmaName) {
    const umaMatch = lookup.get(normalizedUmaName);
    if (umaMatch) {
      return { ...umaMatch, confidence: 0.8 };
    }
  }

  // Fuzzy match on combined
  let bestMatch: UmaMatch | null = null;
  let bestScore = 0;

  for (const [key, entry] of lookup) {
    // Try matching against outfit
    let score = similarity(normalizedOutfit, key);
    if (score > bestScore && score >= 0.7) {
      bestScore = score;
      bestMatch = { ...entry, confidence: score };
    }

    // Try matching against uma name
    score = similarity(normalizedUmaName, key);
    if (score > bestScore && score >= 0.7) {
      bestScore = score;
      bestMatch = { ...entry, confidence: score };
    }
  }

  return bestMatch;
}

// =============================================================================
// Debug
// =============================================================================

/** Export lookup sizes for debugging */
export function getSearchDebugInfo() {
  return {
    skillLookupSize: getSkillLookup().size,
    umaLookupSize: getUmaLookup().size,
  };
}

// Initialize lookups on module load
buildSkillLookup();
buildUmaLookup();
