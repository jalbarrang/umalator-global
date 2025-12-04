/**
 * Extract uma identity from OCR text
 */

import type { UmaMatch } from '@/modules/runners/data/types';
import {
  normalize,
  findBestUmaMatch,
  getUmaLookup,
} from '@/modules/runners/data/search';

/** Extract uma identity (outfit and name) from OCR text */
export function extractUmaIdentity(text: string): UmaMatch | null {
  const umaLookup = getUmaLookup();
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

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
      if (
        line.match(
          /speed|stamina|power|guts|wit|track|distance|style|skills|lvl|close/i,
        )
      ) {
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

