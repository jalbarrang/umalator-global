import type { IStrategyName } from '@/lib/sunday-tools/runner/definitions';
import {
  findBestSkillMatch,
  normalizeSkillName,
  resolveSkillId,
} from '@/modules/data/skills';
import { findBestUmaMatch } from '@/modules/runners/data/search';
import type { OcrEngine, OcrEngineResult } from '@/modules/runners/ocr/engine';
import type { ExtractedSkill, ExtractedUmaData } from '@/modules/runners/ocr/types';

export const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

interface GeminiStructuredResponse {
  name: string;
  outfit: string;
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
  surfaceAptitude: string;
  distanceAptitude: string;
  strategyAptitude: string;
  strategy: string;
  skills: Array<string>;
}

const EXTRACTION_PROMPT = `Analyze this Uma Musume screenshot and extract the runner data.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "name": "character name",
  "outfit": "outfit name in brackets, exactly as shown",
  "speed": 0,
  "stamina": 0,
  "power": 0,
  "guts": 0,
  "wisdom": 0,
  "surfaceAptitude": "best visible surface grade: S, A, B, C, D, E, F, or G",
  "distanceAptitude": "best visible distance grade: S, A, B, C, D, E, F, or G",
  "strategyAptitude": "best visible strategy grade: S, A, B, C, D, E, F, or G",
  "strategy": "best visible strategy using only one of: Nige, Senkou, Sasi, Oikomi",
  "skills": ["every visible skill name exactly as shown, keeping any trailing ○/◎/× and any visible Lvl N marker"]
}

Requirements:
- Read the raw screenshot directly.
- Include all five stat numbers.
- Return the best surface grade, best distance grade, and best strategy grade.
- Return the single best strategy name using Nige, Senkou, Sasi, or Oikomi.
- Include every visible skill name from the screenshot.
- Preserve each skill's visible suffixes such as ○, ◎, ×, and preserve visible level markers like Lvl 1, Lvl 2, Lvl 3, or Lvl 4.
- The suffix symbols ○, ◎, and × are part of the official skill name, not annotations.
- Many different skills exist in both ○ and ◎ versions. Do NOT simplify ◎ into ○ or guess based on familiarity.
- A single circle ○ and a double circle ◎ are different characters and must be transcribed exactly as shown.
- Pay special attention to the tiny symbol at the far right of the skill row; it may be faint but must be preserved exactly.
- If the screenshot shows ◎, return ◎. If it shows ○, return ○. If it shows ×, return ×.
- Example distinctions: "Right-Handed ○" != "Right-Handed ◎", "Hanshin Racecourse ○" != "Hanshin Racecourse ◎", "Long Straightaways ○" != "Long Straightaways ◎".
- Do not add extra keys.
- Do not wrap the JSON in markdown fences.`;

const STRATEGY_NAME_MAP: Record<string, IStrategyName> = {
  nige: 'Front Runner',
  front: 'Front Runner',
  'front runner': 'Front Runner',
  senkou: 'Pace Chaser',
  pace: 'Pace Chaser',
  'pace chaser': 'Pace Chaser',
  sasi: 'Late Surger',
  sashi: 'Late Surger',
  late: 'Late Surger',
  'late surger': 'Late Surger',
  oikomi: 'End Closer',
  end: 'End Closer',
  'end closer': 'End Closer',
  runaway: 'Runaway',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toBase64(buffer: ArrayBuffer): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(buffer).toString('base64');
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  if (typeof btoa !== 'function') {
    throw new Error('Base64 encoding is not available in this environment');
  }

  return btoa(binary);
}

export async function blobToBase64(imageData: Blob | File): Promise<{
  base64: string;
  mimeType: string;
}> {
  const buffer = await imageData.arrayBuffer();

  return {
    base64: toBase64(buffer),
    mimeType: imageData.type || 'image/png',
  };
}

export function buildGeminiRequestBody(imageBase64: string, mimeType: string) {
  return {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: imageBase64,
            },
          },
          {
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 0.8,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  };
}

export function extractGeminiResponseText(response: unknown): string {
  if (!isRecord(response)) {
    throw new Error('Gemini returned an invalid response payload');
  }

  const candidates = response.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('Gemini returned no candidates');
  }

  const parts = candidates
    .flatMap((candidate) => {
      if (!isRecord(candidate) || !isRecord(candidate.content)) {
        return [];
      }

      return Array.isArray(candidate.content.parts) ? candidate.content.parts : [];
    })
    .flatMap((part) => (isRecord(part) && typeof part.text === 'string' ? [part.text] : []));

  const text = parts.join('\n').trim();
  if (!text) {
    throw new Error('Gemini returned no text content');
  }

  return text;
}

export function stripMarkdownFences(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  return match?.[1]?.trim() ?? trimmed;
}

function parseStringField(payload: Record<string, unknown>, key: keyof GeminiStructuredResponse): string {
  const value = payload[key];

  if (typeof value !== 'string') {
    throw new Error(`Gemini JSON is missing a valid "${key}" string`);
  }

  return value.trim();
}

function parseNumberField(payload: Record<string, unknown>, key: keyof GeminiStructuredResponse): number {
  const value = payload[key];

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(`Gemini JSON is missing a valid numeric "${key}" value`);
}

function parseGradeField(payload: Record<string, unknown>, key: keyof GeminiStructuredResponse): string {
  const value = parseStringField(payload, key).toUpperCase();

  if (!/^[SABCDEFG]$/.test(value)) {
    throw new Error(`Gemini JSON is missing a valid "${key}" grade`);
  }

  return value;
}

function validateGeminiJson(value: unknown): GeminiStructuredResponse {
  if (!isRecord(value)) {
    throw new Error('Gemini JSON must be an object');
  }

  const skillsValue = value.skills;
  if (!Array.isArray(skillsValue) || !skillsValue.every((skill) => typeof skill === 'string')) {
    throw new Error('Gemini JSON is missing a valid "skills" array');
  }

  return {
    name: parseStringField(value, 'name'),
    outfit: parseStringField(value, 'outfit'),
    speed: parseNumberField(value, 'speed'),
    stamina: parseNumberField(value, 'stamina'),
    power: parseNumberField(value, 'power'),
    guts: parseNumberField(value, 'guts'),
    wisdom: parseNumberField(value, 'wisdom'),
    surfaceAptitude: parseGradeField(value, 'surfaceAptitude'),
    distanceAptitude: parseGradeField(value, 'distanceAptitude'),
    strategyAptitude: parseGradeField(value, 'strategyAptitude'),
    strategy: parseStringField(value, 'strategy'),
    skills: skillsValue.map((skill) => skill.trim()).filter(Boolean),
  };
}

export function parseGeminiJsonResponse(text: string): GeminiStructuredResponse {
  const jsonText = stripMarkdownFences(text);

  try {
    return validateGeminiJson(JSON.parse(jsonText));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Gemini returned malformed JSON');
    }

    throw error;
  }
}

export function mapGeminiStrategyName(strategy: string): IStrategyName | undefined {
  const normalized = strategy.trim().toLowerCase();

  return STRATEGY_NAME_MAP[normalized];
}

function mapGeminiSkills(skills: Array<string>): Array<ExtractedSkill> {
  const extractedSkills: Array<ExtractedSkill> = [];
  const resolvedSkillIds = new Set<string>();

  for (const rawSkill of skills) {
    const skillName = rawSkill.trim();
    if (!normalizeSkillName(skillName)) {
      continue;
    }

    const match = findBestSkillMatch(skillName);
    if (!match) {
      continue;
    }

    const resolvedId = resolveSkillId(match.id, /lvl\s*\d+/i.test(skillName));
    if (resolvedSkillIds.has(resolvedId)) {
      continue;
    }

    resolvedSkillIds.add(resolvedId);
    extractedSkills.push({
      id: resolvedId,
      name: match.name,
      confidence: match.confidence,
      originalText: skillName,
      fromImage: 0,
    });
  }

  return extractedSkills;
}

export function mapGeminiStructuredData(
  payload: GeminiStructuredResponse,
): Partial<ExtractedUmaData> {
  const structured: Partial<ExtractedUmaData> = {
    outfitName: payload.outfit || undefined,
    umaName: payload.name || undefined,
    umaConfidence: 0,
    speed: payload.speed,
    stamina: payload.stamina,
    power: payload.power,
    guts: payload.guts,
    wisdom: payload.wisdom,
    surfaceAptitude: payload.surfaceAptitude,
    distanceAptitude: payload.distanceAptitude,
    strategyAptitude: payload.strategyAptitude,
    strategy: mapGeminiStrategyName(payload.strategy),
    skills: mapGeminiSkills(payload.skills),
  };

  const umaMatch = findBestUmaMatch(payload.outfit, payload.name);
  if (umaMatch) {
    structured.outfitId = umaMatch.outfitId;
    structured.outfitName = umaMatch.outfitName;
    structured.umaName = umaMatch.umaName;
    structured.umaConfidence = umaMatch.confidence;
  }

  return structured;
}

async function getGeminiErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string') {
      return body.error.message;
    }
  } catch {
    // Ignore JSON parsing errors and fall back to the generic message.
  }

  return `Gemini API request failed with status ${response.status}`;
}

export class GeminiEngine implements OcrEngine {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  async recognize(imageData: Blob | File): Promise<OcrEngineResult> {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const { base64, mimeType } = await blobToBase64(imageData);
    const response = await fetch(`${GEMINI_API_URL}?key=${encodeURIComponent(this.apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildGeminiRequestBody(base64, mimeType)),
    });

    if (!response.ok) {
      throw new Error(await getGeminiErrorMessage(response));
    }

    const payload = await response.json();
    const text = extractGeminiResponseText(payload);
    const structured = mapGeminiStructuredData(parseGeminiJsonResponse(text));

    return { structured };
  }

  async destroy(): Promise<void> {
    // No-op: the Gemini engine does not keep worker/process state alive.
  }
}
