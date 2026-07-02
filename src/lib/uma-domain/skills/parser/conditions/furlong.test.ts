import { describe, expect, it } from 'vitest';
import {
  GroundCondition,
  Grade,
  Season,
  TimeOfDay,
  Weather
} from '@/lib/uma-domain/course/definitions';
import { Mood, Strategy } from '@/lib/uma-domain/runner/definitions';
import { Region, RegionList } from '@/lib/uma-domain/shared/region';
import { createParser } from '../ConditionParser';
import type { ApplyParams } from '../definitions';
import type { CourseData } from '@/lib/uma-domain/course/definitions';

const TEST_COURSE: CourseData = {
  courseId: 99999,
  raceTrackId: 10006,
  distance: 1200,
  distanceType: 1,
  surface: 1,
  turn: 2,
  courseSetStatus: [],
  corners: [{ start: 400, length: 200 }],
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

function buildApplyParams(): ApplyParams {
  const regions = new RegionList();
  regions.push(new Region(0, TEST_COURSE.distance));

  return {
    regions,
    course: TEST_COURSE,
    runner: {
      baseStats: { speed: 1200, stamina: 1200, power: 800, guts: 400, wit: 400 },
      strategy: Strategy.FrontRunner,
      mood: Mood.Great
    },
    extra: {
      ground: GroundCondition.Firm,
      weather: Weather.Sunny,
      season: Season.Spring,
      timeOfDay: TimeOfDay.Midday,
      grade: Grade.G1
    }
  };
}

function bounds(regions: RegionList): Array<[number, number]> {
  return regions.map((r) => [r.start, r.end]);
}

describe('furlong condition', () => {
  it('selects the second furlong for furlong==1', () => {
    const parser = createParser();
    const [regions] = parser.parse('furlong==1').apply(buildApplyParams());
    expect(bounds(regions)).toEqual([[200, 400]]);
  });

  it('selects the third furlong for furlong==2', () => {
    const parser = createParser();
    const [regions] = parser.parse('furlong==2').apply(buildApplyParams());
    expect(bounds(regions)).toEqual([[400, 600]]);
  });

  it('selects the fourth furlong for furlong==3', () => {
    const parser = createParser();
    const [regions] = parser.parse('furlong==3').apply(buildApplyParams());
    expect(bounds(regions)).toEqual([[600, 800]]);
  });
});
