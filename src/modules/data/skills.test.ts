import { describe, expect, it } from 'vitest';
import { skillsService } from '@/modules/data/services/SkillService';

const findBestSkillMatch = skillsService.findBestSkillMatch;
const normalizeSkillName = skillsService.normalizeSkillName;
const resolveSkillId = skillsService.resolveSkillId;

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
    expect(normalizeSkillName('Right-Handed ©')).toBe(normalizeSkillName('Right-Handed ◎'));
    expect(normalizeSkillName('Right-Handed ®')).toBe(normalizeSkillName('Right-Handed ○'));
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
    expect(findBestSkillMatch('Right-Handed ©')?.id).toBe('200011');
    expect(findBestSkillMatch('Right-Handed ®')?.id).toBe('200012');
    expect(findBestSkillMatch('Right-Handed ⊚')?.id).toBe('200011');
  });

  it('selects the correct version when multiple skill IDs share the same normalized name', () => {
    expect(findBestSkillMatch('Shooting Star Lvl 4')?.id).toBe('100011');
    expect(findBestSkillMatch('Shooting Star')?.id).toBe('900011');
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

describe('GameTora skill loading', () => {
  it('preserves released skills and adds upcoming skills', () => {
    expect(skillsService.getById('10351')).toBeDefined();
    expect(skillsService.getById('110031')).toBeDefined();
    expect(skillsService.getById('910031')).toBeDefined();
  });

  it('applies loc.en condition overrides for base and gene versions', () => {
    expect(skillsService.getById('110031')?.alternatives[0]?.condition).toBe(
      'is_finalcorner==1&corner==0'
    );
    expect(skillsService.getById('910031')?.alternatives[0]?.condition).toBe(
      'is_finalcorner==1&corner==0'
    );
  });

  it('exposes release provenance and activation metadata', () => {
    expect(skillsService.isReleased('10351')).toBe(true);

    const upcomingSkill = skillsService
      .getAll()
      .find((skill) => !skillsService.isReleased(skill.id));
    expect(upcomingSkill).toBeDefined();
    expect(skillsService.isReleased(upcomingSkill!.id)).toBe(false);

    expect(skillsService.getActivationCheck('110221')).toBe('guaranteed');
    expect(skillsService.getActivationCheck('910221')).toBe('wit-check');
  });

  it('preserves master-only effect metadata when GameTora omits it', () => {
    const skill = skillsService.getById('202031');
    expect(skill?.alternatives[0]?.effects[1]?.valueUsage).toBe(8);
    expect(skill?.alternatives[0]?.effects[1]?.valueLevelUsage).toBe(1);
  });
});
