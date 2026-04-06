/**
 * Extract skills from OCR text
 */

import {
  findBestSkillMatch,
  getSkillLookup,
  normalizeSkillName,
  resolveSkillId,
  type SkillLookupEntry,
} from '@/modules/data/skills';
import type { ExtractedSkill } from './types';

type SkillLineCandidate = {
  entry: SkillLookupEntry;
  confidence: number;
  start: number;
  end: number;
};

/**
 * Normalize a line for level-marker detection.
 * Same grade-symbol rules as normalizeSkillName, but PRESERVES level indicators
 * so assignLevelMarkers can find them.
 */
const normalizeLineWithLevels = (value: string): string => {
  return value
    .normalize('NFKC')
    .replaceAll('\u25ef', '\u25cb')
    .replaceAll('\u2b55', '\u25cb')
    .replaceAll('\u25e6', '\u25cb')
    .replaceAll('\u20dd', '\u25cb')
    .replaceAll('\u29bf', '\u25ce')
    .replaceAll('\u229a', '\u25ce')
    .replaceAll('\u2715', '\u00d7')
    .replaceAll('\u2716', '\u00d7')
    .replaceAll('\u00a9', '\u25ce')
    .replaceAll('\u00ae', '\u25cb')
    .replace(/\s+[Oo0]$/u, '\u25cb')
    .replace(/\s+[Xx]$/u, '\u00d7')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u25cb\u25ce\u00d7]/gu, '');
};

const collectSubstringCandidates = (
  normalizedLine: string,
  skillLookup: Map<string, SkillLookupEntry>,
): Array<SkillLineCandidate> => {
  const candidatesById = new Map<string, SkillLineCandidate>();

  for (const [key, entry] of skillLookup) {
    if (key.length < 5) {
      continue;
    }

    const start = normalizedLine.indexOf(key);
    if (start < 0) {
      continue;
    }

    const nextCandidate: SkillLineCandidate = {
      entry,
      confidence: 0.85,
      start,
      end: start + key.length,
    };

    const existingCandidate = candidatesById.get(entry.id);
    if (!existingCandidate) {
      candidatesById.set(entry.id, nextCandidate);
      continue;
    }

    const existingLength = existingCandidate.end - existingCandidate.start;
    const nextLength = nextCandidate.end - nextCandidate.start;

    if (nextLength > existingLength) {
      candidatesById.set(entry.id, nextCandidate);
    }
  }

  const sortedCandidates = Array.from(candidatesById.values()).sort((a, b) => a.start - b.start);

  return sortedCandidates.filter((candidate, index) => {
    for (let i = 0; i < sortedCandidates.length; i++) {
      if (i === index) {
        continue;
      }

      const other = sortedCandidates[i];
      const isContainedWithinOther =
        candidate.start >= other.start &&
        candidate.end <= other.end &&
        (candidate.start > other.start || candidate.end < other.end);

      if (isContainedWithinOther) {
        return false;
      }
    }

    return true;
  });
};

const assignLevelMarkers = (
  normalizedLine: string,
  candidates: Array<SkillLineCandidate>,
): Map<string, boolean> => {
  const hasLevelBySkillId = new Map<string, boolean>();
  const levelRegex = /(?:lvl|level)\d+/g;

  for (const match of normalizedLine.matchAll(levelRegex)) {
    const markerIndex = match.index;
    if (markerIndex === undefined) {
      continue;
    }

    let assignedCandidate: SkillLineCandidate | undefined;

    for (const candidate of candidates) {
      if (candidate.end > markerIndex) {
        break;
      }

      assignedCandidate = candidate;
    }

    if (!assignedCandidate) {
      assignedCandidate = candidates.find((candidate) => candidate.start >= markerIndex);
    }

    if (assignedCandidate) {
      hasLevelBySkillId.set(assignedCandidate.entry.id, true);
    }
  }

  return hasLevelBySkillId;
};

/** Extract skills from OCR text */
export function extractSkills(text: string, imageIndex: number): Array<ExtractedSkill> {
  const skillLookup = getSkillLookup();
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const skills: Array<ExtractedSkill> = [];
  const seenIds = new Set<string>();

  for (const line of lines) {
    // Skip very short lines or lines that are just numbers/single letters
    if (line.length < 4 || /^[\d\s]+$/.test(line) || /^[A-Za-z]$/.test(line.trim())) {
      continue;
    }

    // Skip lines containing outfit names (bracketed text like [Maverick])
    if (/\[[^\]]+\]/.test(line)) {
      continue;
    }

    const cleanedLine = line
      .replace(/[£$&¥@#%^*()[\]{}|\\<>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedLine || cleanedLine.length < 4) {
      continue;
    }

    // normalizeSkillName strips level indicators — used for skill name matching
    const normalizedLine = normalizeSkillName(cleanedLine);
    if (!normalizedLine || normalizedLine.length < 4) {
      continue;
    }

    // normalizeLineWithLevels preserves level indicators — used for level detection
    const lineWithLevels = normalizeLineWithLevels(cleanedLine);

    let candidates = collectSubstringCandidates(normalizedLine, skillLookup);

    // Fallback to fuzzy full-line matching when no substring match exists
    if (candidates.length === 0) {
      const wholeMatch = findBestSkillMatch(cleanedLine);

      if (wholeMatch) {
        const normalizedMatchName = normalizeSkillName(wholeMatch.name);
        const start = normalizedLine.indexOf(normalizedMatchName);

        candidates = [
          {
            entry: {
              id: wholeMatch.id,
              geneId: wholeMatch.geneId,
              name: wholeMatch.name,
              rarity: 0,
            },
            confidence: wholeMatch.confidence,
            start: start >= 0 ? start : 0,
            end: start >= 0 ? start + normalizedMatchName.length : normalizedMatchName.length,
          },
        ];
      }
    }

    if (candidates.length === 0) {
      continue;
    }

    const hasLevelBySkillId = assignLevelMarkers(lineWithLevels, candidates);

    for (const candidate of candidates) {
      const hasLevel = hasLevelBySkillId.get(candidate.entry.id) ?? false;
      const resolvedId = resolveSkillId(candidate.entry.id, hasLevel);

      if (seenIds.has(resolvedId)) {
        continue;
      }

      seenIds.add(resolvedId);
      skills.push({
        id: resolvedId,
        name: candidate.entry.name,
        confidence: candidate.confidence,
        originalText: line,
        fromImage: imageIndex,
      });
    }
  }

  return skills;
}
