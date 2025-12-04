/**
 * OCR parsing utilities for extracting uma data from screenshots
 */

import umas from '@data/umas.json';
import GametoraSkills from '@data/gametora/skills.json';
import type { ISkill } from '@/modules/skills/types';

// Types
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

  imageCount: number;
  unrecognized: string[];
}

export interface SkillMatch {
  id: string;
  name: string;
  confidence: number;
  originalText: string;
}

export interface ExtractedSkill extends SkillMatch {
  fromImage: number;
}

interface UmaMatch {
  outfitId: string;
  outfitName: string;
  umaName: string;
  confidence: number;
}

// Normalize text for fuzzy matching
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[☆♪★♫◎○●◇◆■□▲△▼▽♠♣♥♦]/g, '') // Remove special game chars
    .replace(/[^\w\s]/g, ' ') // Replace other special chars with space
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

// Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

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

// Calculate similarity ratio (0-1)
export function similarity(a: string, b: string): number {
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);

  if (normalizedA === normalizedB) return 1;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

  const distance = levenshteinDistance(normalizedA, normalizedB);
  const maxLength = Math.max(normalizedA.length, normalizedB.length);

  return 1 - distance / maxLength;
}

// Build skill lookup map from gametora skills
type SkillLookupEntry = { id: string; name: string };
const skillLookup = new Map<string, SkillLookupEntry>();

function buildSkillLookup() {
  if (skillLookup.size > 0) return;

  for (const skill of GametoraSkills as ISkill[]) {
    const id = String(skill.id);

    // Add main skill name_en
    if (skill.name_en) {
      const key = normalize(skill.name_en);
      if (key && !skillLookup.has(key)) {
        skillLookup.set(key, { id, name: skill.name_en });
      }
    }

    // Add alternative enname
    if (skill.enname && skill.enname !== skill.name_en) {
      const key = normalize(skill.enname);
      if (key && !skillLookup.has(key)) {
        skillLookup.set(key, { id, name: skill.enname });
      }
    }

    // Add inherited version
    if (skill.gene_version) {
      const inheritedId = String(skill.gene_version.id);

      if (skill.gene_version.name_en) {
        const key = normalize(skill.gene_version.name_en);
        if (key && !skillLookup.has(key)) {
          skillLookup.set(key, { id: inheritedId, name: skill.gene_version.name_en });
        }
      }
    }
  }
}

// Build uma lookup map
type UmaLookupEntry = { outfitId: string; outfitName: string; umaName: string };
const umaLookup = new Map<string, UmaLookupEntry>();

// Type for uma data structure
interface UmaData {
  name: string[];
  outfits: Record<string, string>;
}

function buildUmaLookup() {
  if (umaLookup.size > 0) return;

  for (const [_baseId, uma] of Object.entries(umas) as [string, UmaData][]) {
    const umaName = uma.name[1] || '';

    for (const [outfitId, outfitName] of Object.entries(uma.outfits)) {
      // Store with full combined key
      const combinedKey = normalize(outfitName + ' ' + umaName);
      umaLookup.set(combinedKey, { outfitId, outfitName, umaName });

      // Store with outfit name only (without brackets)
      const outfitOnly = normalize(outfitName.replace(/[[\]]/g, ''));
      if (!umaLookup.has(outfitOnly)) {
        umaLookup.set(outfitOnly, { outfitId, outfitName, umaName });
      }

      // Store with uma name only
      const umaOnly = normalize(umaName);
      if (!umaLookup.has(umaOnly)) {
        umaLookup.set(umaOnly, { outfitId, outfitName, umaName });
      }
    }
  }
}

// Initialize lookups
buildSkillLookup();
buildUmaLookup();

// Find best skill match for OCR text
export function findBestSkillMatch(ocrText: string): SkillMatch | null {
  const normalizedOcr = normalize(ocrText);
  if (!normalizedOcr || normalizedOcr.length < 3) return null;

  // Exact match first
  const exactMatch = skillLookup.get(normalizedOcr);
  if (exactMatch) {
    return {
      id: exactMatch.id,
      name: exactMatch.name,
      confidence: 1,
      originalText: ocrText,
    };
  }

  // Fuzzy match
  let bestMatch: SkillMatch | null = null;
  let bestScore = 0;

  for (const [key, entry] of skillLookup) {
    const score = similarity(normalizedOcr, key);
    if (score > bestScore && score >= 0.7) {
      bestScore = score;
      bestMatch = {
        id: entry.id,
        name: entry.name,
        confidence: score,
        originalText: ocrText,
      };
    }
  }

  return bestMatch;
}

// Find best uma match from outfit and name
export function findBestUmaMatch(outfit: string, umaName: string): UmaMatch | null {
  const normalizedOutfit = normalize(outfit.replace(/[[\]]/g, ''));
  const normalizedUmaName = normalize(umaName);

  // Try combined match first
  const combinedKey = normalize(outfit + ' ' + umaName);
  const exactCombined = umaLookup.get(combinedKey);
  if (exactCombined) {
    return { ...exactCombined, confidence: 1 };
  }

  // Try outfit match
  if (normalizedOutfit) {
    const outfitMatch = umaLookup.get(normalizedOutfit);
    if (outfitMatch) {
      return { ...outfitMatch, confidence: 0.9 };
    }
  }

  // Try uma name match
  if (normalizedUmaName) {
    const umaMatch = umaLookup.get(normalizedUmaName);
    if (umaMatch) {
      return { ...umaMatch, confidence: 0.8 };
    }
  }

  // Fuzzy match on combined
  let bestMatch: UmaMatch | null = null;
  let bestScore = 0;

  for (const [key, entry] of umaLookup) {
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

// Extract stats from OCR text
export function extractStats(text: string): Partial<ExtractedUmaData> {
  const result: Partial<ExtractedUmaData> = {};

  // Look for 3-4 digit numbers that could be stats
  // Stats typically appear in order: Speed, Stamina, Power, Guts, Wisdom
  const statNumbers = text.match(/\b(\d{3,4})\b/g);

  if (statNumbers && statNumbers.length >= 5) {
    // Filter out numbers that are clearly not stats (like 11774 total score)
    const validStats = statNumbers
      .map((n) => parseInt(n, 10))
      .filter((n) => n >= 100 && n <= 2000);

    if (validStats.length >= 5) {
      result.speed = validStats[0];
      result.stamina = validStats[1];
      result.power = validStats[2];
      result.guts = validStats[3];
      result.wisdom = validStats[4];
    }
  }

  return result;
}

// Extract uma identity from OCR text
export function extractUmaIdentity(text: string): UmaMatch | null {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Look for outfit pattern [OutfitName]
  let outfit = '';
  let umaName = '';
  let outfitLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const outfitMatch = line.match(/\[([^\]]+)\]/);
    if (outfitMatch) {
      outfit = outfitMatch[0]; // Include brackets
      outfitLineIdx = i;
      break;
    }
  }

  // Uma name is typically on the line after or before outfit
  if (outfitLineIdx >= 0) {
    // Check line after outfit
    if (outfitLineIdx + 1 < lines.length) {
      const nextLine = lines[outfitLineIdx + 1];
      // Uma name should not contain certain keywords
      if (!nextLine.match(/witness|legend|change|epithet|rank/i)) {
        umaName = nextLine;
      }
    }

    // Check line before outfit if we didn't find it after
    if (!umaName && outfitLineIdx > 0) {
      const prevLine = lines[outfitLineIdx - 1];
      if (!prevLine.match(/witness|legend|change|epithet|rank/i)) {
        umaName = prevLine;
      }
    }
  }

  // Also try to find uma name by looking for known patterns
  if (!umaName) {
    for (const line of lines) {
      // Skip lines that are clearly not uma names
      if (line.match(/speed|stamina|power|guts|wit|track|distance|style|skills|lvl|close/i)) {
        continue;
      }
      // Check if this line matches any known uma name
      const normalizedLine = normalize(line);
      if (normalizedLine.length > 3 && umaLookup.has(normalizedLine)) {
        umaName = line;
        break;
      }
    }
  }

  if (outfit || umaName) {
    return findBestUmaMatch(outfit, umaName);
  }

  return null;
}

// Extract skills from OCR text
export function extractSkills(text: string, imageIndex: number): ExtractedSkill[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const skills: ExtractedSkill[] = [];
  const seenIds = new Set<string>();

  for (const line of lines) {
    // Skip lines that are clearly not skill names
    if (line.match(/^(speed|stamina|power|guts|wit|track|distance|style|skills|inspiration|career|close|select|cancel|change|epithet|witness|legend|umamusume|details|lvl\s*\d+)$/i)) {
      continue;
    }

    // Skip very short lines or lines that are just numbers
    if (line.length < 3 || /^\d+$/.test(line)) {
      continue;
    }

    // Remove level indicator (Lvl 4, etc.)
    const cleanedLine = line.replace(/\s*lvl\s*\d+\s*/i, '').trim();
    if (!cleanedLine) continue;

    const match = findBestSkillMatch(cleanedLine);
    if (match && !seenIds.has(match.id)) {
      seenIds.add(match.id);
      skills.push({
        ...match,
        originalText: line,
        fromImage: imageIndex,
      });
    }
  }

  return skills;
}

// Parse complete OCR result
export function parseOcrResult(
  text: string,
  imageIndex: number,
  existingData?: Partial<ExtractedUmaData>,
): ExtractedUmaData {
  const result: ExtractedUmaData = {
    umaConfidence: existingData?.umaConfidence ?? 0,
    skills: existingData?.skills ? [...existingData.skills] : [],
    imageCount: (existingData?.imageCount ?? 0) + 1,
    unrecognized: existingData?.unrecognized ? [...existingData.unrecognized] : [],
  };

  // Extract uma identity from first image only
  if (imageIndex === 0 || !existingData?.outfitId) {
    const umaMatch = extractUmaIdentity(text);
    if (umaMatch) {
      result.outfitId = umaMatch.outfitId;
      result.outfitName = umaMatch.outfitName;
      result.umaName = umaMatch.umaName;
      result.umaConfidence = umaMatch.confidence;
    }
  } else {
    // Keep existing uma data
    result.outfitId = existingData?.outfitId;
    result.outfitName = existingData?.outfitName;
    result.umaName = existingData?.umaName;
    result.umaConfidence = existingData?.umaConfidence ?? 0;
  }

  // Extract stats from first image only
  if (imageIndex === 0 || !existingData?.speed) {
    const stats = extractStats(text);
    result.speed = stats.speed ?? existingData?.speed;
    result.stamina = stats.stamina ?? existingData?.stamina;
    result.power = stats.power ?? existingData?.power;
    result.guts = stats.guts ?? existingData?.guts;
    result.wisdom = stats.wisdom ?? existingData?.wisdom;
  } else {
    // Keep existing stats
    result.speed = existingData?.speed;
    result.stamina = existingData?.stamina;
    result.power = existingData?.power;
    result.guts = existingData?.guts;
    result.wisdom = existingData?.wisdom;
  }

  // Extract and accumulate skills (dedupe by ID)
  const newSkills = extractSkills(text, imageIndex);
  const existingIds = new Set(result.skills.map((s) => s.id));

  for (const skill of newSkills) {
    if (!existingIds.has(skill.id)) {
      existingIds.add(skill.id);
      result.skills.push(skill);
    }
  }

  // Track unrecognized lines for debugging
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const recognizedTexts = new Set([
    ...result.skills.map((s) => s.originalText.toLowerCase()),
  ]);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      !recognizedTexts.has(lower) &&
      line.length > 3 &&
      !line.match(/^(speed|stamina|power|guts|wit|track|distance|style|skills|inspiration|career|close|select|cancel|umamusume|details|\d+|[sabcdefg]|turf|dirt|sprint|mile|medium|long|front|pace|late|end|witness|legend|change|epithet|rank|lvl\s*\d+)$/i)
    ) {
      result.unrecognized.push(line);
    }
  }

  return result;
}

// Export lookup sizes for debugging
export function getDebugInfo() {
  return {
    skillLookupSize: skillLookup.size,
    umaLookupSize: umaLookup.size,
  };
}

