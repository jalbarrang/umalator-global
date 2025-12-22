/**
 * Main OCR parser - orchestrates extraction of all data from OCR text
 */

import { extractStats } from './stats';
import { extractUmaIdentity } from './uma';
import { extractSkills } from './skills';
import type { ExtractedUmaData } from './types';

/** Parse complete OCR result and extract all uma data */
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
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const recognizedTexts = new Set([...result.skills.map((s) => s.originalText.toLowerCase())]);

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      !recognizedTexts.has(lower) &&
      line.length > 3 &&
      !line.match(
        /^(speed|stamina|power|guts|wit|track|distance|style|skills|inspiration|career|close|select|cancel|umamusume|details|\d+|[sabcdefg]|turf|dirt|sprint|mile|medium|long|front|pace|late|end|witness|legend|change|epithet|rank|lvl\s*\d+)$/i,
      )
    ) {
      result.unrecognized.push(line);
    }
  }

  return result;
}
