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
  distance: 2000,
  distanceType: 2,
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

function runnerWithHeals(count: number): Runner {
  return { healsActivatedCount: count } as unknown as Runner;
}

describe('is_activate_heal_skill condition', () => {
  it('gates on the runner having activated a recovery skill', () => {
    const parser = createParser();
    const [regions, dynamic] = parser.parse('is_activate_heal_skill==1').apply(buildApplyParams());

    expect(regions.map((r) => [r.start, r.end])).toEqual([[0, 2000]]);
    expect(dynamic?.(runnerWithHeals(0))).toBe(false);
    expect(dynamic?.(runnerWithHeals(1))).toBe(true);
  });

  it('throws for unsupported comparisons', () => {
    const parser = createParser();
    expect(() => parser.parse('is_activate_heal_skill==0').apply(buildApplyParams())).toThrow();
  });
});
