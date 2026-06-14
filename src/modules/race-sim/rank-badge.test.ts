import { describe, expect, it } from 'vitest';
import { RANK_BADGES, rankLabel } from './rank-badge';

describe('rankLabel', () => {
  it('has strictly ascending thresholds', () => {
    for (let i = 1; i < RANK_BADGES.length; i++) {
      expect(RANK_BADGES[i][0]).toBeGreaterThan(RANK_BADGES[i - 1][0]);
    }
  });

  it('maps known thresholds', () => {
    expect(rankLabel(0)).toBe('G');
    expect(rankLabel(299)).toBe('G');
    expect(rankLabel(300)).toBe('G+');
    expect(rankLabel(14500)).toBe('S');
    expect(rankLabel(15899)).toBe('S');
    expect(rankLabel(17500)).toBe('SS');
    expect(rankLabel(17527)).toBe('SS'); // sample CM runner rank_score
    expect(rankLabel(19200)).toBe('SS+');
    expect(rankLabel(190400)).toBe('LS24');
    expect(rankLabel(999_999)).toBe('LS24');
  });

  it('clamps negatives to the lowest badge', () => {
    expect(rankLabel(-5)).toBe('G');
  });
});
