import { describe, expect, it } from 'vitest';
import { binomPmf, copiesOdds, RATEUP_P, type CopiesOdds } from '@/modules/carat/model/odds';

const REFERENCE: Array<{ pulls: number; odds: CopiesOdds }> = [
  { pulls: 0, odds: { none: 1, lb0: 0, lb1: 0, lb2: 0, lb3: 0, mlb: 0 } },
  { pulls: 50, odds: { none: 0.6863, lb0: 0.2593, lb1: 0.048, lb2: 0.0058, lb3: 0.0005, mlb: 0 } },
  { pulls: 200, odds: { none: 0, lb0: 0.2219, lb1: 0.3353, lb2: 0.2521, lb3: 0.1257, mlb: 0.0649 } },
  { pulls: 400, odds: { none: 0, lb0: 0, lb1: 0.0492, lb2: 0.1488, lb3: 0.2243, mlb: 0.5777 } },
  { pulls: 1000, odds: { none: 0, lb0: 0, lb1: 0, lb2: 0, lb3: 0, mlb: 1 } }
];

const KEYS = ['none', 'lb0', 'lb1', 'lb2', 'lb3', 'mlb'] as const;

describe('binomial odds', () => {
  it('matches a known binomial PMF value', () => {
    expect(binomPmf(2, 10, 0.5)).toBeCloseTo(45 / 1024, 8);
  });

  it('matches the reference pull odds table and sums to 1', () => {
    for (const { pulls, odds: expected } of REFERENCE) {
      const actual = copiesOdds({ pulls, p: RATEUP_P, startingDupes: 0 });
      const sum = KEYS.reduce((total, key) => total + actual[key], 0);

      expect(sum, `${pulls} pulls total probability`).toBeCloseTo(1, 6);
      for (const key of KEYS) {
        expect(actual[key], `${pulls} pulls ${key}`).toBeCloseTo(expected[key], 2);
        expect(Math.abs(actual[key] - expected[key]), `${pulls} pulls ${key}`).toBeLessThanOrEqual(0.005);
      }
    }
  });

  it('increases 200-pull MLB odds with starting dupes', () => {
    const expected = [0.0649, 0.1907, 0.4428];
    const actual = [0, 1, 2].map((startingDupes) => copiesOdds({ pulls: 200, p: RATEUP_P, startingDupes }).mlb);

    for (const [index, value] of actual.entries()) {
      expect(Math.abs(value - expected[index]), `dupes ${index}`).toBeLessThanOrEqual(0.005);
      if (index > 0) expect(value).toBeGreaterThanOrEqual(actual[index - 1]);
    }
  });
});
