import { describe, expect, it } from 'vitest';
import { paidCaratsFromPacks } from '@/modules/carat/model/paid';

describe('paidCaratsFromPacks', () => {
  it('counts a 1500 global pack at face value and USD cost', () => {
    expect(paidCaratsFromPacks({ p1500: 1 }, 'global')).toEqual({ paidCarats: 1500, usd: 14 });
  });

  it('applies server multipliers for larger packs', () => {
    expect(paidCaratsFromPacks({ p11000: 1, p7500: 1 }, 'jp')).toEqual({ paidCarats: 21450, usd: 210 });
    expect(paidCaratsFromPacks({ p11000: 1, p7500: 1 }, 'global')).toEqual({ paidCarats: 20350, usd: 210 });
  });
});
