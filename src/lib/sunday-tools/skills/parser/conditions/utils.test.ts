import { describe, expect, it } from 'vitest';
import { GroundCondition, Grade, Season, TimeOfDay, Weather } from '@/lib/sunday-tools/course/definitions';
import { Mood, Strategy } from '@/lib/sunday-tools/runner/definitions';
import { Region, RegionList } from '@/lib/sunday-tools/shared/region';
import { shiftRegionsForwardByMinTime } from './utils';
import type { ConditionFilterParams } from '../definitions';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';

const TEST_COURSE: CourseData = {
  courseId: 99999,
  raceTrackId: 10006,
  distance: 2400,
  distanceType: 3,
  surface: 1,
  turn: 2,
  courseSetStatus: [],
  corners: [],
  straights: [],
  slopes: [],
  laneMax: 13500,
  courseWidth: 11.25,
  horseLane: 11.25 / 18,
  laneChangeAcceleration: 0.02 * 1.5,
  laneChangeAccelerationPerFrame: (0.02 * 1.5) / 15,
  maxLaneDistance: (11.25 * 13500) / 10000,
  moveLanePoint: 30,
};

function buildParams(regions: Array<[number, number]>, minTime: number): ConditionFilterParams {
  const regionList = new RegionList();
  regions.forEach(([start, end]) => regionList.push(new Region(start, end)));

  return {
    regions: regionList,
    arg: minTime,
    course: TEST_COURSE,
    runner: {
      baseStats: {
        speed: 1200,
        stamina: 1200,
        power: 800,
        guts: 400,
        wit: 400,
      },
      strategy: Strategy.FrontRunner,
      mood: Mood.Great,
    },
    extra: {
      ground: GroundCondition.Firm,
      weather: Weather.Sunny,
      season: Season.Spring,
      timeOfDay: TimeOfDay.Midday,
      grade: Grade.G1,
    },
  };
}

describe('shiftRegionsForwardByMinTime', () => {
  it('leaves regions unchanged when min time is zero', () => {
    const shifted = shiftRegionsForwardByMinTime(buildParams([[0, 40], [1950, 2100]], 0));

    expect(shifted.map((r) => [r.start, r.end])).toEqual([
      [0, 40],
      [1950, 2100],
    ]);
  });

  it('drops regions that end before the min-time distance and clips overlapping ones', () => {
    const shifted = shiftRegionsForwardByMinTime(buildParams([[0, 40], [1125, 1200], [1950, 2100]], 10));

    expect(shifted.map((r) => [r.start, r.end])).toEqual([
      [1125, 1200],
      [1950, 2100],
    ]);
  });

  it('clips a region that starts before and ends after the min-time distance', () => {
    const shifted = shiftRegionsForwardByMinTime(buildParams([[0, 140]], 10));

    expect(shifted).toHaveLength(1);
    expect(shifted[0]!.start).toBeGreaterThan(0);
    expect(shifted[0]!.end).toBe(140);
  });
});
