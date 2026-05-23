import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import { coursesService } from '@/modules/data/services/CourseService';
import { skillsService } from '@/modules/data/registry';
import { createRaceConditions, racedefToParams } from '@/utils/races';
import * as runnerUtils from '@/lib/sunday-tools/runner/runner.utils';
import { getActivateableSkills } from './utils';

const TEST_COURSE_ID = 10101;
const NON_SIMULATABLE_SKILL_ID = '100801';
const SIMULATABLE_SKILL_ID = '10071';

describe('getActivateableSkills', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not call buildSkillData for non-simulatable skills by default', () => {
    const buildSkillData = vi.spyOn(runnerUtils, 'buildSkillData').mockReturnValue([]);

    expect(skillsService.isSimulatable(NON_SIMULATABLE_SKILL_ID)).toBe(false);
    expect(skillsService.isSimulatable(SIMULATABLE_SKILL_ID)).toBe(true);

    const runner = createRunnerState({ outfitId: '100101', skills: [] });
    const course = coursesService.getSimCourse(TEST_COURSE_ID);
    const raceParams = racedefToParams(createRaceConditions());

    getActivateableSkills(
      [NON_SIMULATABLE_SKILL_ID, SIMULATABLE_SKILL_ID],
      runner,
      course,
      raceParams
    );

    const calledSkillIds = buildSkillData.mock.calls.map((call) => call[0].skillId);
    expect(calledSkillIds).not.toContain(NON_SIMULATABLE_SKILL_ID);
    expect(calledSkillIds).toContain(SIMULATABLE_SKILL_ID);
  });

  it('can probe non-simulatable skills when simulatableOnly is false', () => {
    const buildSkillData = vi.spyOn(runnerUtils, 'buildSkillData').mockReturnValue([]);

    const runner = createRunnerState({ outfitId: '100101', skills: [] });
    const course = coursesService.getSimCourse(TEST_COURSE_ID);
    const raceParams = racedefToParams(createRaceConditions());

    getActivateableSkills(
      [NON_SIMULATABLE_SKILL_ID],
      runner,
      course,
      raceParams,
      { simulatableOnly: false }
    );

    const calledSkillIds = buildSkillData.mock.calls.map((call) => call[0].skillId);
    expect(calledSkillIds).toContain(NON_SIMULATABLE_SKILL_ID);
  });
});
