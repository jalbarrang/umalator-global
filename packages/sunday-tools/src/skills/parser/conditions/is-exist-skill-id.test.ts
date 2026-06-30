import { describe, expect, it } from 'vitest';
import {
  GroundCondition,
  Grade,
  Season,
  TimeOfDay,
  Weather
} from 'sunday-tools/course/definitions';
import { Mood, Strategy } from 'sunday-tools/runner/definitions';
import { Region, RegionList } from 'sunday-tools/shared/region';
import { createParser } from '../ConditionParser';
import type { ApplyParams } from '../definitions';
import type { CourseData } from 'sunday-tools/course/definitions';

const TEST_COURSE: CourseData = {
  courseId: 99999,
  raceTrackId: 10006,
  distance: 2000,
  distanceType: 3,
  surface: 1,
  turn: 2,
  courseSetStatus: [],
  corners: [{ start: 1600, length: 200 }],
  straights: [],
  slopes: [],
  laneMax: 13500,
  courseWidth: 11.25,
  horseLane: 11.25 / 18,
  laneChangeAcceleration: 0.02 * 1.5,
  laneChangeAccelerationPerFrame: (0.02 * 1.5) / 15,
  maxLaneDistance: (11.25 * 13500) / 10000,
  moveLanePoint: 30
};

function buildApplyParams(commonSkills?: Map<string, number>): ApplyParams {
  const regions = new RegionList();
  regions.push(new Region(0, TEST_COURSE.distance));

  return {
    regions,
    course: TEST_COURSE,
    runner: {
      baseStats: { speed: 1200, stamina: 1200, power: 800, guts: 400, wit: 400 },
      strategy: Strategy.PaceChaser,
      mood: Mood.Great
    },
    extra: {
      ground: GroundCondition.Firm,
      weather: Weather.Sunny,
      season: Season.Spring,
      timeOfDay: TimeOfDay.Midday,
      grade: Grade.G1,
      commonSkills
    } as ApplyParams['extra']
  };
}

function bounds(regions: RegionList): Array<[number, number]> {
  return regions.map((r) => [r.start, r.end]);
}

const SYMPATHY = '201631';

describe('is_exist_skill_id condition', () => {
  it('keeps regions when a runner in the field owns the skill', () => {
    const parser = createParser();
    const commonSkills = new Map<string, number>([[SYMPATHY, 1]]);
    const [regions] = parser
      .parse(`is_exist_skill_id==${SYMPATHY}`)
      .apply(buildApplyParams(commonSkills));
    expect(bounds(regions)).toEqual([[0, 2000]]);
  });

  it('drops regions when the field snapshot exists but nobody owns the skill', () => {
    const parser = createParser();
    const commonSkills = new Map<string, number>([['999999', 2]]);
    const [regions] = parser
      .parse(`is_exist_skill_id==${SYMPATHY}`)
      .apply(buildApplyParams(commonSkills));
    expect(bounds(regions)).toEqual([]);
  });

  it('assumes the skill may be present when no field snapshot is available', () => {
    const parser = createParser();
    const [regions] = parser
      .parse(`is_exist_skill_id==${SYMPATHY}`)
      .apply(buildApplyParams(undefined));
    expect(bounds(regions)).toEqual([[0, 2000]]);
  });
});
