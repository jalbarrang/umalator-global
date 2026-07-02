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
  distance: 2000,
  distanceType: 2,
  surface: 1,
  turn: 2,
  courseSetStatus: [],
  corners: [],
  straights: [],
  // Uphill [800, 1400] straddles the race midpoint (1000); downhill should be ignored.
  slopes: [
    { start: 800, length: 600, slope: 10000 },
    { start: 1500, length: 200, slope: -10000 }
  ],
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
      strategy: Strategy.PaceChaser,
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
  return regions.map((region) => [region.start, region.end] as [number, number]).filter(([s, e]) => e > s);
}

describe('up_slope_random_later_half condition', () => {
  // Uphill [800, 1400] intersected with the later half [1000, 2000] => [1000, 1400].
  it('keeps only the uphill portion within the later half of the race', () => {
    const parser = createParser();
    const [regions] = parser.parse('up_slope_random_later_half==1').apply(buildApplyParams());

    expect(bounds(regions)).toEqual([[1000, 1400]]);
  });

  it('throws for unsupported comparisons', () => {
    const parser = createParser();
    expect(() => parser.parse('up_slope_random_later_half==0').apply(buildApplyParams())).toThrow();
  });
});
