import { describe, expect, it } from 'vitest';
import { extractSkills } from './skills';

describe('extractSkills', () => {
  it('drops candidates strictly contained inside a longer matched skill span', () => {
    const result = extractSkills('Shooting Star of Dioskouroi', 0);
    const ids = result.map((skill) => skill.id);

    expect(ids).toContain('900331');
    expect(ids).not.toContain('900011');
    expect(result).toHaveLength(1);
  });

  it('handles ©/® OCR variants without breaking level-marker assignment', () => {
    const result = extractSkills('Right-Handed © Shooting Star Lvl 4', 0);
    const ids = result.map((skill) => skill.id);

    expect(ids).toContain('200011');
    expect(ids).toContain('100011');
    expect(ids).not.toContain('900011');
  });

  it('maps raw double-circle OCR variants in mixed skill lines', () => {
    const result = extractSkills('Right-Handed ⊚ Shooting Star', 0);
    const ids = result.map((skill) => skill.id);

    expect(ids).toContain('200011');
    expect(ids).toContain('900011');
    expect(ids).not.toContain('100011');
  });
});
