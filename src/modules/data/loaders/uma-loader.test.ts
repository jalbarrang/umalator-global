import { describe, expect, it } from 'vitest';

import { loadUmas } from '@/modules/data/loaders/uma-loader';

describe('loadUmas', () => {
  it('uses master cutover for released outfits, not GameTora release_en', () => {
    const result = loadUmas(
      [
        {
          char_id: 1001,
          card_id: 100101,
          name_jp: 'Test',
          name_en: 'Test EN',
          title_en_gl: 'Outfit A'
        },
        {
          char_id: 1001,
          card_id: 100102,
          name_jp: 'Test',
          name_en: 'Test EN',
          title_en_gl: 'Outfit B'
        }
      ],
      new Set(['100102'])
    );

    expect(result.releasedOutfits).toEqual(new Set(['100102']));
    expect(result.umas['1001']?.outfits['100101']).toBe('Outfit A');
    expect(result.umas['1001']?.outfits['100102']).toBe('Outfit B');
  });
});
