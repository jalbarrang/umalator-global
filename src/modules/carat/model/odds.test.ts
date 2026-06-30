import { describe, expect, it } from 'vitest';
import {
  binomPmf,
  copiesOdds,
  RATEUP_P,
  targetGoalsOdds,
  type CopiesOdds
} from '@/modules/carat/model/odds';

const REFERENCE: Array<{ pulls: number; odds: CopiesOdds }> = [
  { pulls: 0, odds: { none: 1, lb0: 0, lb1: 0, lb2: 0, lb3: 0, mlb: 0 } },
  { pulls: 50, odds: { none: 0.6863, lb0: 0.2593, lb1: 0.048, lb2: 0.0058, lb3: 0.0005, mlb: 0 } },
  {
    pulls: 200,
    odds: { none: 0, lb0: 0.2219, lb1: 0.3353, lb2: 0.2521, lb3: 0.1257, mlb: 0.0649 }
  },
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
        expect(Math.abs(actual[key] - expected[key]), `${pulls} pulls ${key}`).toBeLessThanOrEqual(
          0.005
        );
      }
    }
  });

  it('matches single-card ≥1-copy odds for one goal', () => {
    // No spark: one goal of 1 copy = 1 - (1-p)^pulls.
    const single = 1 - copiesOdds({ pulls: 100 }).none;
    expect(targetGoalsOdds({ pulls: 100, goals: [1] })).toBeCloseTo(single, 8);
    // Spark guarantees the single 1-copy goal outright.
    expect(targetGoalsOdds({ pulls: 200, goals: [1] })).toBe(1);
    // Empty goals are always satisfied.
    expect(targetGoalsOdds({ pulls: 0, goals: [] })).toBe(1);
  });

  it('only fails when the spark cannot cover the shortfall', () => {
    // Two 1-copy goals at 200 pulls = 1 spark. You fail only if BOTH cards whiff
    // their random pulls, since one spark covers a single miss.
    const bothMiss = Math.pow(1 - RATEUP_P, 400);
    expect(targetGoalsOdds({ pulls: 200, goals: [1, 1] })).toBeCloseTo(1 - bothMiss, 6);
  });

  it('matches a single MLB goal against copiesOdds.mlb', () => {
    // One 5-copy (MLB) goal must equal the single-card MLB odds.
    expect(targetGoalsOdds({ pulls: 200, goals: [5] })).toBeCloseTo(
      copiesOdds({ pulls: 200 }).mlb,
      6
    );
  });

  it('drops far below 100% for MLB + LB0 on a 2-SSR banner with 400 pulls', () => {
    // The misleading case: 400 pulls = 2 sparks, but MLB needs 5 copies, so this
    // is nowhere near guaranteed.
    const chance = targetGoalsOdds({ pulls: 400, goals: [5, 1] });
    expect(chance).toBeGreaterThan(0);
    expect(chance).toBeLessThan(0.6);
  });

  it('is harder for higher copy goals', () => {
    const values = [1, 2, 3, 4, 5].map((goal) => targetGoalsOdds({ pulls: 300, goals: [goal, 1] }));
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeLessThanOrEqual(values[index - 1]);
    }
  });

  it('increases 200-pull MLB odds with starting dupes', () => {
    const expected = [0.0649, 0.1907, 0.4428];
    const actual = [0, 1, 2].map(
      (startingDupes) => copiesOdds({ pulls: 200, p: RATEUP_P, startingDupes }).mlb
    );

    for (const [index, value] of actual.entries()) {
      expect(Math.abs(value - expected[index]), `dupes ${index}`).toBeLessThanOrEqual(0.005);
      if (index > 0) expect(value).toBeGreaterThanOrEqual(actual[index - 1]);
    }
  });
});
