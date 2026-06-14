import { describe, expect, it } from 'vitest';
import { computeRankScore, estimateRunnerRankScore } from './rank-score';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';

// Aptitudes for the validation runners: ground A(7), distance S(8), style A(7).
const apt = {
  turf: 7,
  dirt: 7,
  sprint: 8,
  mile: 8,
  medium: 8,
  long: 8,
  front: 7,
  pace: 7,
  late: 7,
  end: 7
};

describe('computeRankScore', () => {
  // Real CM runner (rank_score 17527): unique at level 6, ★3+.
  it('matches a real runner within the unique-level assumption', () => {
    const score = computeRankScore(
      [1200, 744, 1029, 893, 898],
      apt,
      ['100271', '200154', '200171', '200332', '200592', '200602', '200611', '200702', '201032', '201072', '201391', '210061', '900061', '910611'],
      { star: 3, uniqueLevel: 6 }
    );
    expect(score).toBe(17527);
  });

  it('scores stats only when no skills are supplied', () => {
    const statsOnly = computeRankScore([1200, 744, 1029, 893, 898], apt, []);
    expect(statsOnly).toBe(12620);
  });

  it('lowering the unique level reduces the score by 170 per level', () => {
    const skills = ['100271', '200154'];
    const lvl6 = computeRankScore([1200, 744, 1029, 893, 898], apt, skills, { uniqueLevel: 6 });
    const lvl5 = computeRankScore([1200, 744, 1029, 893, 898], apt, skills, { uniqueLevel: 5 });
    expect(lvl6 - lvl5).toBe(170);
  });
});

describe('estimateRunnerRankScore', () => {
  it('returns the imported rankScore verbatim when present', () => {
    const runner = createRunnerState({ outfitId: '100101', rankScore: 12345 });
    expect(estimateRunnerRankScore(runner)).toBe(12345);
  });

  it('estimates from stats/aptitudes/skills when no rankScore', () => {
    const runner = createRunnerState({
      outfitId: '100101',
      speed: 1200,
      stamina: 744,
      power: 1029,
      guts: 893,
      wisdom: 898,
      distanceAptitude: 'S',
      surfaceAptitude: 'A',
      strategyAptitude: 'A',
      skills: []
    });
    expect(estimateRunnerRankScore(runner)).toBe(12620);
  });
});
