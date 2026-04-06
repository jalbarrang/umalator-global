import { afterEach, describe, expect, it, vi } from 'vitest';
import { GEMINI_API_URL, GeminiEngine } from './gemini';

function createGeminiApiResponse(text: string) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
  };
}

function mockGeminiFetch(text: string) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(createGeminiApiResponse(text)), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );

  vi.stubGlobal('fetch', fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GeminiEngine', () => {
  it('parses fenced JSON responses from Gemini', async () => {
    const fencedJson = `\`\`\`json
${JSON.stringify({
      name: 'Taiki Shuttle',
      outfit: '[Wild Frontier]',
      speed: 1200,
      stamina: 900,
      power: 1000,
      guts: 800,
      wisdom: 950,
      surfaceAptitude: 'A',
      distanceAptitude: 'A',
      strategyAptitude: 'S',
      strategy: 'Senkou',
      skills: ['Right-Handed ○'],
    })}
\`\`\``;
    const fetchMock = mockGeminiFetch(fencedJson);

    const engine = new GeminiEngine('demo-key');
    const result = await engine.recognize(new Blob(['image'], { type: 'image/png' }));

    expect(fetchMock).toHaveBeenCalledWith(
      `${GEMINI_API_URL}?key=demo-key`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(result.structured?.speed).toBe(1200);
    expect(result.structured?.wisdom).toBe(950);
    expect(result.structured?.skills?.map((skill) => skill.id)).toEqual(['200012']);
  });

  it('maps Gemini strategy names into the app strategy names', async () => {
    mockGeminiFetch(
      JSON.stringify({
        name: 'Taiki Shuttle',
        outfit: '[Wild Frontier]',
        speed: 1100,
        stamina: 900,
        power: 1000,
        guts: 800,
        wisdom: 950,
        surfaceAptitude: 'A',
        distanceAptitude: 'A',
        strategyAptitude: 'S',
        strategy: 'Nige',
        skills: [],
      }),
    );

    const engine = new GeminiEngine('demo-key');
    const result = await engine.recognize(new Blob(['image'], { type: 'image/png' }));

    expect(result.structured?.strategy).toBe('Front Runner');
    expect(result.structured?.strategyAptitude).toBe('S');
  });

  it('resolves skill IDs based on whether Gemini preserved a level marker', async () => {
    mockGeminiFetch(
      JSON.stringify({
        name: 'Taiki Shuttle',
        outfit: '[Wild Frontier]',
        speed: 1100,
        stamina: 900,
        power: 1000,
        guts: 800,
        wisdom: 950,
        surfaceAptitude: 'A',
        distanceAptitude: 'A',
        strategyAptitude: 'S',
        strategy: 'Senkou',
        skills: ['Shooting Star Lvl 4', 'Shooting Star', 'Right-Handed ○'],
      }),
    );

    const engine = new GeminiEngine('demo-key');
    const result = await engine.recognize(new Blob(['image'], { type: 'image/png' }));
    const skillIds = result.structured?.skills?.map((skill) => skill.id) ?? [];

    expect(skillIds).toContain('100011');
    expect(skillIds).toContain('900011');
    expect(skillIds).toContain('200012');
  });

  it('maps raw Gemini circle OCR variants to the intended grade-specific skills', async () => {
    mockGeminiFetch(
      JSON.stringify({
        name: 'Taiki Shuttle',
        outfit: '[Wild Frontier]',
        speed: 1100,
        stamina: 900,
        power: 1000,
        guts: 800,
        wisdom: 950,
        surfaceAptitude: 'A',
        distanceAptitude: 'A',
        strategyAptitude: 'S',
        strategy: 'Senkou',
        skills: ['Right-Handed ©', 'Right-Handed ®', 'Right-Handed ⊚'],
      }),
    );

    const engine = new GeminiEngine('demo-key');
    const result = await engine.recognize(new Blob(['image'], { type: 'image/png' }));
    const skillIds = result.structured?.skills?.map((skill) => skill.id) ?? [];

    expect(skillIds).toContain('200011');
    expect(skillIds).toContain('200012');
    expect(skillIds.filter((skillId) => skillId === '200011')).toHaveLength(1);
  });

  it('fuzzy matches misspelled outfit and uma names into canonical app data', async () => {
    mockGeminiFetch(
      JSON.stringify({
        name: 'Taiki Shuttel',
        outfit: '[Wild Frontie]',
        speed: 1100,
        stamina: 900,
        power: 1000,
        guts: 800,
        wisdom: 950,
        surfaceAptitude: 'A',
        distanceAptitude: 'A',
        strategyAptitude: 'S',
        strategy: 'Senkou',
        skills: [],
      }),
    );

    const engine = new GeminiEngine('demo-key');
    const result = await engine.recognize(new Blob(['image'], { type: 'image/png' }));

    expect(result.structured?.outfitId).toBe('101001');
    expect(result.structured?.outfitName).toBe('[Wild Frontier]');
    expect(result.structured?.umaName).toBe('Taiki Shuttle');
    expect(result.structured?.umaConfidence).toBeGreaterThan(0.7);
  });
});
