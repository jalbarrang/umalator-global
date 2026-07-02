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
import type { Runner } from '@/lib/uma-domain/runner/types';
import { createParser } from '../ConditionParser';
import type { ApplyParams } from '../definitions';
import type { CourseData } from '@/lib/uma-domain/course/definitions';

const TEST_COURSE: CourseData = {
  courseId: 99999,
  raceTrackId: 10006,
  distance: 1600,
  distanceType: 3,
  surface: 1,
  turn: 2,
  courseSetStatus: [],
  corners: [{ start: 1200, length: 200 }],
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

function runnerWithHalfCounts(firstHalf: number, secondHalf: number): Runner {
  return { skillsActivatedHalfRaceMap: [firstHalf, secondHalf] } as unknown as Runner;
}

describe('activate_count_later_half condition', () => {
  it('counts only second-half activations against the threshold', () => {
    const parser = createParser();
    const [regions, dynamic] = parser
      .parse('activate_count_later_half>=2')
      .apply(buildApplyParams());

    expect(regions.map((r) => [r.start, r.end])).toEqual([[0, 1600]]);
    // First-half activations do not count.
    expect(dynamic?.(runnerWithHalfCounts(5, 1))).toBe(false);
    expect(dynamic?.(runnerWithHalfCounts(0, 2))).toBe(true);
    expect(dynamic?.(runnerWithHalfCounts(0, 3))).toBe(true);
  });

  it('supports the >=1 threshold', () => {
    const parser = createParser();
    const [, dynamic] = parser.parse('activate_count_later_half>=1').apply(buildApplyParams());

    expect(dynamic?.(runnerWithHalfCounts(0, 0))).toBe(false);
    expect(dynamic?.(runnerWithHalfCounts(0, 1))).toBe(true);
  });
});
