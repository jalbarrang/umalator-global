import { describe, expect, it } from 'vitest';
import { parseOcrResult } from './parser';

describe('parseOcrResult', () => {
  it('routes text OCR through skill extraction and level-aware ID resolution', () => {
    const result = parseOcrResult(
      {
        text: 'Shooting Star Lvl 4 Right-Handed ○',
      },
      0,
    );

    const skillIds = result.skills.map((skill) => skill.id);

    expect(skillIds).toContain('100011');
    expect(skillIds).toContain('200012');
    expect(skillIds).not.toContain('900011');
  });

  it('routes structured OCR results without requiring raw text', () => {
    const result = parseOcrResult(
      {
        structured: {
          surfaceAptitude: 'S',
          distanceAptitude: 'A',
          strategyAptitude: 'B',
          strategy: 'Runaway',
          skills: [
            {
              id: '200012',
              name: 'Right-Handed ○',
              confidence: 0.95,
              originalText: 'Right-Handed ○',
              fromImage: 0,
            },
          ],
        },
      },
      0,
    );

    expect(result.surfaceAptitude).toBe('S');
    expect(result.distanceAptitude).toBe('A');
    expect(result.strategyAptitude).toBe('B');
    expect(result.strategy).toBe('Runaway');
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.id).toBe('200012');
  });

  it('accumulates data across images and dedupes skills by final resolved ID', () => {
    const first = parseOcrResult(
      {
        text: [
          'Speed Stamina Power Guts Wit',
          '1000 900 800 700 600',
          'Shooting Star',
          'Right-Handed ○',
        ].join('\n'),
      },
      0,
    );

    const second = parseOcrResult(
      {
        text: [
          'Speed Stamina Power Guts Wit',
          '1500 1400 1300 1200 1100',
          'Right-Handed ○',
          'Left-Handed ○',
        ].join('\n'),
      },
      1,
      first,
    );

    expect(second.imageCount).toBe(2);

    // First image owns stats
    expect(second.speed).toBe(1000);
    expect(second.stamina).toBe(900);
    expect(second.power).toBe(800);
    expect(second.guts).toBe(700);
    expect(second.wisdom).toBe(600);

    const dedupedSkillIds = new Set(second.skills.map((skill) => skill.id));

    // Shooting Star without level resolves to inherited gene version
    expect(dedupedSkillIds.has('900011')).toBe(true);
    expect(dedupedSkillIds.has('200012')).toBe(true);
    expect(dedupedSkillIds.has('200022')).toBe(true);
    expect(second.skills).toHaveLength(dedupedSkillIds.size);
  });

  it('merges text and structured payloads in the same OCR result', () => {
    const result = parseOcrResult(
      {
        text: 'Right-Handed ○',
        structured: {
          strategy: 'Runaway',
          strategyAptitude: 'A',
        },
      },
      0,
    );

    expect(result.strategy).toBe('Runaway');
    expect(result.strategyAptitude).toBe('A');
    expect(result.skills.some((skill) => skill.id === '200012')).toBe(true);
  });
});
