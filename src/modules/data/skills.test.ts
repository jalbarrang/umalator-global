import { describe, expect, it } from 'vitest';
import { findBestSkillMatch, normalizeSkillName, resolveSkillId } from '@/modules/data/skills';

describe('normalizeSkillName', () => {
  it('normalizes grade symbol variants while preserving grade semantics', () => {
    expect(normalizeSkillName('Right-Handed ◯')).toBe(normalizeSkillName('Right-Handed ○'));
    expect(normalizeSkillName('Right-Handed ⊚')).toBe(normalizeSkillName('Right-Handed ◎'));
    expect(normalizeSkillName('Right-Handed ✖')).toBe(normalizeSkillName('Right-Handed ×'));
  });

  it('normalizes trailing OCR mistakes for O/0/X into grade symbols', () => {
    expect(normalizeSkillName('Right-Handed O')).toBe(normalizeSkillName('Right-Handed ○'));
    expect(normalizeSkillName('Right-Handed 0')).toBe(normalizeSkillName('Right-Handed ○'));
    expect(normalizeSkillName('Right-Handed X')).toBe(normalizeSkillName('Right-Handed ×'));
  });

  it('normalizes ©/® OCR mistakes into the expected grade symbols', () => {
    expect(normalizeSkillName('Right-Handed ©')).toBe(normalizeSkillName('Right-Handed ○'));
    expect(normalizeSkillName('Right-Handed ®')).toBe(normalizeSkillName('Right-Handed ◎'));
  });

  it('strips level markers and punctuation for matching', () => {
    expect(normalizeSkillName('Shadow Break Lvl 4')).toBe(normalizeSkillName('Shadow Break'));
    expect(normalizeSkillName('Shadow Break Level 4!!')).toBe(normalizeSkillName('Shadow Break'));
  });
});

describe('findBestSkillMatch', () => {
  it('matches OCR grade mistakes to the correct skills', () => {
    expect(findBestSkillMatch('Right-Handed O')?.id).toBe('200012');
    expect(findBestSkillMatch('Right-Handed 0')?.id).toBe('200012');
    expect(findBestSkillMatch('Right-Handed X')?.id).toBe('200013');
  });
});

describe('resolveSkillId', () => {
  it('keeps base ID when a level marker is present', () => {
    expect(resolveSkillId('100011', true)).toBe('100011');
  });

  it('resolves to inherited gene ID when no level marker is present', () => {
    expect(resolveSkillId('100011', false)).toBe('900011');
  });

  it('returns the same ID for skills without a gene version', () => {
    expect(resolveSkillId('200012', false)).toBe('200012');
  });
});
