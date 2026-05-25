import { describe, expect, it } from 'vitest';

import {
  collectReleasedOutfitIds,
  collectReleasedSupportCardIds
} from '@/modules/data/loaders/global-cutover';

describe('global-cutover', () => {
  it('collects outfit ids from master uma extract', () => {
    const outfitIds = collectReleasedOutfitIds({
      '1001': {
        outfits: { '100101': 'A', '100102': 'B' }
      }
    });

    expect(outfitIds).toEqual(new Set(['100101', '100102']));
  });

  it('collects support card ids from master support card extract keys', () => {
    const cardIds = collectReleasedSupportCardIds({
      '30001': {},
      '30002': {}
    });

    expect(cardIds).toEqual(new Set(['30001', '30002']));
  });
});
