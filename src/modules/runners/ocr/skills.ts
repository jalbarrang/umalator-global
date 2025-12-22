/**
 * Extract skills from OCR text
 */

import type { ExtractedSkill } from './types';
import { findBestSkillMatch, getSkillLookup, normalize } from '@/modules/runners/data/search';

/** Extract skills from OCR text */
export function extractSkills(text: string, imageIndex: number): Array<ExtractedSkill> {
  const skillLookup = getSkillLookup();
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const skills: Array<ExtractedSkill> = [];
  const seenIds = new Set<string>();

  // Try matching each line, and also try splitting by common separators
  for (const line of lines) {
    // Skip very short lines or lines that are just numbers/single letters
    if (line.length < 4 || /^[\d\s]+$/.test(line) || /^[A-Za-z]$/.test(line.trim())) {
      continue;
    }

    // Skip lines containing outfit names (bracketed text like [Maverick])
    if (/\[[^\]]+\]/.test(line)) {
      continue;
    }

    // Clean the line - remove level indicators and special chars
    const cleanedLine = line
      .replace(/\s*lvl\s*\d+\s*/gi, ' ')
      .replace(/[£$&¥@#%^*()[\]{}|\\<>]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedLine || cleanedLine.length < 4) continue;

    // Try the whole line first
    const wholeMatch = findBestSkillMatch(cleanedLine);

    if (wholeMatch && !seenIds.has(wholeMatch.id)) {
      seenIds.add(wholeMatch.id);

      if (wholeMatch.geneId) {
        seenIds.add(wholeMatch.geneId);

        skills.push({
          ...wholeMatch,
          id: wholeMatch.geneId, // Use gene ID as the ID, since it's inherited unique
          originalText: line,
          fromImage: imageIndex,
        });

        continue;
      }

      skills.push({
        ...wholeMatch,
        originalText: line,
        fromImage: imageIndex,
      });

      continue;
    }

    // If whole line didn't match, try splitting on common patterns
    // Some lines have multiple skills: "Shadow Break Lvl 4 Angling and Scheming"
    // Or skills separated by spaces where one skill ends and another begins

    // Try each known skill name against this line as a potential substring
    for (const [key, entry] of skillLookup) {
      if (seenIds.has(entry.id)) continue;

      const normalizedLine = normalize(cleanedLine);

      // Check if this skill name appears in the line
      if (normalizedLine.includes(key) && key.length >= 5) {
        seenIds.add(entry.id);

        if (entry.geneId) {
          seenIds.add(entry.geneId);
          skills.push({
            id: entry.geneId,
            name: entry.name,
            confidence: 0.85,
            originalText: line,
            fromImage: imageIndex,
          });

          continue;
        }

        skills.push({
          id: entry.id,
          name: entry.name,
          confidence: 0.85,
          originalText: line,
          fromImage: imageIndex,
        });
      }
    }
  }

  return skills;
}
