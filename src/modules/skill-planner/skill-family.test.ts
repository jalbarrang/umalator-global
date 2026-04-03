import { describe, expect, it } from 'vitest';
import { skillCollection } from '@/modules/data/skills';
import {
  getRepresentativePrerequisiteIds,
  getUnsatisfiedRepresentativePrerequisiteIds,
  isSkillCoveredByOwnedFamily,
} from './skill-family';

const getSkillIdByName = (name: string): string => {
  const skillId = Object.keys(skillCollection).find((candidateId) => skillCollection[candidateId].name === name);

  if (!skillId) {
    throw new Error(`Could not find skill named "${name}"`);
  }

  return skillId;
};

describe('skill-family prerequisite coverage', () => {
  it('treats an obtained upgrade as covering its base prerequisite during expansion', () => {
    const concentrationId = getSkillIdByName('Concentration');
    const focusId = getSkillIdByName('Focus');
    const gatekeptId = getSkillIdByName('Gatekept');

    expect(getRepresentativePrerequisiteIds(concentrationId)).toEqual(expect.arrayContaining([focusId, gatekeptId]));
    expect(isSkillCoveredByOwnedFamily(gatekeptId, [focusId])).toBe(true);
    expect(getUnsatisfiedRepresentativePrerequisiteIds(concentrationId, [focusId])).toEqual([]);
  });

  it('treats an obtained gold as covering its white prerequisite family during expansion', () => {
    const escapeArtistId = getSkillIdByName('Escape Artist');
    const fastPacedId = getSkillIdByName('Fast-Paced');

    expect(getRepresentativePrerequisiteIds(escapeArtistId)).toEqual([fastPacedId]);
    expect(isSkillCoveredByOwnedFamily(fastPacedId, [escapeArtistId])).toBe(true);
    expect(getUnsatisfiedRepresentativePrerequisiteIds(escapeArtistId, [escapeArtistId])).toEqual([]);
  });
});
