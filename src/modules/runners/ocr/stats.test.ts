import { describe, expect, it } from 'vitest';
import { extractStats } from './stats';

describe('extractStats', () => {
  it('keeps comma-grouped numbers together so non-stat values do not pollute stat parsing', () => {
    const result = extractStats(
      [
        'Speed Stamina Power Guts Wit',
        '14,441 1200 667 791 466 1030',
      ].join('\n'),
    );

    expect(result).toEqual({
      speed: 1200,
      stamina: 667,
      power: 791,
      guts: 466,
      wisdom: 1030,
    });
  });
});
