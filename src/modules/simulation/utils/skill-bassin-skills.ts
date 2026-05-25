import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { RaceParameters } from '@/lib/sunday-tools/common/race';
import { skillsService } from '@/modules/data/registry';
import type { SkillEntry } from '@/modules/data/services/SkillService';
import type { IRunnerState } from '@/modules/runners/components/runner-card/types';
import { getBaseSkillsToTest } from '@/modules/skills/utils';

function sortSkills(a: SkillEntry, b: SkillEntry): number {
  if (!a.releaseDate || !b.releaseDate) return 0;

  const dateCmp = a.releaseDate.localeCompare(b.releaseDate);

  if (dateCmp !== 0) return dateCmp;

  return a.name.localeCompare(b.name);
}

export function getActivatableSkillIdsForRace(
  runner: IRunnerState,
  course: CourseData,
  raceParams: RaceParameters
): Array<string> {
  const baseSkillsToTest = getBaseSkillsToTest();
  const filterer = skillsService.createFilterer({ runner, course, raceParams });

  const candidateSkills = baseSkillsToTest.filter(
    (skillId) =>
      !runner.skills.includes(skillId) &&
      (!skillId.startsWith('9') || !runner.skills.includes('1' + skillId.slice(1)))
  );

  const candidates = filterer.filterCandidates(candidateSkills);

  return filterer.probeActivation(candidates);
}

export function getActivatableSkillsForRace(
  runner: IRunnerState,
  course: CourseData,
  raceParams: RaceParameters
): Array<SkillEntry> {
  const activatableIds = getActivatableSkillIdsForRace(runner, course, raceParams);

  return activatableIds
    .map((id) => skillsService.getById(id))
    .filter((s): s is SkillEntry => s !== undefined)
    .sort(sortSkills);
}
