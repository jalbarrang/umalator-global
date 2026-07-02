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
  distance: 1800,
  distanceType: 2,
  surface: 1,
  turn: 2,
  courseSetStatus: [],
  corners: [],
  // One long straight spanning the whole final phase plus a short early straight.
  straights: [new Region(0, 200), new Region(1000, 1600)],
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

// Phase 2 of an 1800m course spans [1200, 1500]: first half [1200, 1350],
// latter half [1350, 1500]. The long straight [1000, 1600] covers both.
describe('phase half straight random conditions', () => {
  it('phase_first_half_straight_random keeps straights within the first half of the phase', () => {
    const parser = createParser();
    const [regions] = parser.parse('phase_first_half_straight_random==2').apply(buildApplyParams());

    expect(bounds(regions)).toEqual([[1200, 1350]]);
  });

  it('phase_latter_half_straight_random keeps straights within the latter half of the phase', () => {
    const parser = createParser();
    const [regions] = parser
      .parse('phase_latter_half_straight_random==2')
      .apply(buildApplyParams());

    expect(bounds(regions)).toEqual([[1350, 1500]]);
  });
});
