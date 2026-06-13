import { describe, expect, it } from 'vitest';
import { skillsService } from '@/modules/data/services/SkillService';
import {
  getRepresentativePrerequisiteIds,
  getUnsatisfiedRepresentativePrerequisiteIds,
  isSkillCoveredByOwnedFamily
} from './skill-family';

const getSkillIdByName = (name: string): string => {
  const skill = skillsService.getAll().find((skill) => skill.name === name);

  if (!skill) {
    throw new Error(`Could not find skill named "${name}"`);
  }

  return skill.id;
};

describe('skill-family prerequisite coverage', () => {
  it('treats an obtained upgrade as covering its base prerequisite during expansion', () => {
    const concentrationId = getSkillIdByName('Concentration');
    const focusId = getSkillIdByName('Focus');
    const gatekeptId = getSkillIdByName('Gatekept');

    expect(getRepresentativePrerequisiteIds(concentrationId)).toEqual(
      expect.arrayContaining([focusId, gatekeptId])
    );
    expect(isSkillCoveredByOwnedFamily(gatekeptId, [focusId])).toBe(true);
    expect(getUnsatisfiedRepresentativePrerequisiteIds(concentrationId, [focusId])).toEqual([]);
  });

  it('treats an obtained gold as covering its white prerequisite family during expansion', () => {
    const escapeArtistId = getSkillIdByName('Escape Artist');
    const fastPacedId = getSkillIdByName('Fast-Paced');

    expect(getRepresentativePrerequisiteIds(escapeArtistId)).toEqual([fastPacedId]);
    expect(isSkillCoveredByOwnedFamily(fastPacedId, [escapeArtistId])).toBe(true);
    expect(getUnsatisfiedRepresentativePrerequisiteIds(escapeArtistId, [escapeArtistId])).toEqual(
      []
    );
  });

  it('links opponent/FOV debuff gold skills to their white prerequisite (Gaze family)', () => {
    // Petrifying Gaze (gold) / Intense Gaze (white) are FOV debuffs: their
    // effects carry negative modifiers aimed at opponents, not self. They must
    // still resolve as a family so the gold links to its white prerequisite.
    const petrifyingGazeId = getSkillIdByName('Petrifying Gaze');
    const intenseGazeId = getSkillIdByName('Intense Gaze');

    expect(getRepresentativePrerequisiteIds(petrifyingGazeId)).toEqual([intenseGazeId]);
    expect(isSkillCoveredByOwnedFamily(intenseGazeId, [petrifyingGazeId])).toBe(true);
    expect(
      getUnsatisfiedRepresentativePrerequisiteIds(petrifyingGazeId, [petrifyingGazeId])
    ).toEqual([]);
  });
});
