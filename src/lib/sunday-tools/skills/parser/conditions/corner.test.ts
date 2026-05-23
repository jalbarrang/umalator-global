import { describe, expect, it } from 'vitest';
import {
  GroundCondition,
  Grade,
  Season,
  TimeOfDay,
  Weather
} from '@/lib/sunday-tools/course/definitions';
import { Mood, Strategy } from '@/lib/sunday-tools/runner/definitions';
import { Region, RegionList } from '@/lib/sunday-tools/shared/region';
import { createParser } from '../ConditionParser';
import type { ApplyParams } from '../definitions';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';

const TEST_COURSE: CourseData = {
  courseId: 99999,
  raceTrackId: 10006,
  distance: 1000,
  distanceType: 3,
  surface: 1,
  turn: 2,
  courseSetStatus: [],
  corners: [
    { start: 100, length: 100 },
    { start: 300, length: 100 },
    { start: 500, length: 100 },
    { start: 700, length: 100 },
    { start: 900, length: 50 }
  ],
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
      baseStats: {
        speed: 1200,
        stamina: 1200,
        power: 800,
        guts: 400,
        wit: 400
      },
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

function regionBounds(regions: RegionList): Array<[number, number]> {
  return regions.map((region) => [region.start, region.end]);
}

describe('corner condition', () => {
  it('keeps existing corner!=0 behavior as all corner regions', () => {
    const parser = createParser();
    const [regions] = parser.parse('corner!=0').apply(buildApplyParams());

    expect(regionBounds(regions)).toEqual([
      [100, 200],
      [300, 400],
      [500, 600],
      [700, 800],
      [900, 950]
    ]);
  });

  it('supports corner!=non-zero by excluding the matching corner bucket', () => {
    const parser = createParser();
    const [regions] = parser.parse('corner!=3').apply(buildApplyParams());

    expect(regionBounds(regions)).toEqual([
      [0, 700],
      [800, 1000]
    ]);
  });
});
