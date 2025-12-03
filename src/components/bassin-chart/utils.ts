import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { getParser } from '@simulation/lib/ConditionParser';
import { CourseData } from '@simulation/lib/CourseData';
import { RaceParameters } from '@simulation/lib/RaceParameters';
import { Perspective } from '@simulation/lib/RaceSolver';
import {
  buildBaseStats,
  buildSkillData,
} from '@simulation/lib/RaceSolverBuilder';
import { Region, RegionList } from '@simulation/lib/Region';

export function getActivateableSkills(
  skills: string[],
  horse: RunnerState,
  course: CourseData,
  racedef: RaceParameters,
) {
  const parser = getParser();
  const h2 = buildBaseStats(horse);

  const wholeCourse = new RegionList();
  wholeCourse.push(new Region(0, course.distance));
  return skills.filter((id) => {
    let sd;
    try {
      sd = buildSkillData(
        h2,
        racedef,
        course,
        wholeCourse,
        parser,
        id,
        Perspective.Any,
      );
    } catch {
      return false;
    }

    return sd.some(
      (trigger) =>
        trigger.regions.length > 0 && trigger.regions[0].start < 9999,
    );
  });
}

export function getNullRow(skillid: string) {
  return {
    id: skillid,
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    results: [],
    runData: null,
  };
}
