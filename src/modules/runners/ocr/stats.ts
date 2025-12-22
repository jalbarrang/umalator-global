/**
 * Extract stats from OCR text
 */

import type { ExtractedUmaData } from './types';

/** Extract stats (speed, stamina, power, guts, wisdom) from OCR text */
export function extractStats(text: string): Partial<ExtractedUmaData> {
  const result: Partial<ExtractedUmaData> = {};

  // Strategy: Find stats by looking for the line containing stat labels
  // OCR output shows: "& Speed ¥ Stamina La Power & Guts - Wit"
  // followed by:      "$ 1000 A 821 A 883 [IF 386 (C 483"
  const lines = text.split('\n');
  let statsLineIndex = -1;

  // Find the line containing stat labels
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (
      (line.includes('speed') && line.includes('stamina')) ||
      (line.includes('speed') && line.includes('power')) ||
      (line.includes('stamina') && line.includes('guts'))
    ) {
      statsLineIndex = i;
      break;
    }
  }

  // Look for numbers in the stats line and the line after
  const searchText =
    statsLineIndex >= 0 ? lines.slice(statsLineIndex, statsLineIndex + 2).join(' ') : text;

  // Extract all numbers that could be stats (3-4 digits, 100-2000 range)
  const allNumbers = searchText.match(/\d+/g) || [];
  const validStats = allNumbers.map((n) => parseInt(n, 10)).filter((n) => n >= 100 && n <= 2000);

  // We need exactly 5 stats in order
  if (validStats.length >= 5) {
    result.speed = validStats[0];
    result.stamina = validStats[1];
    result.power = validStats[2];
    result.guts = validStats[3];
    result.wisdom = validStats[4];
  }

  return result;
}
