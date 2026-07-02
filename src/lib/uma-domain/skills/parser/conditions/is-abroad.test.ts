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

function buildCourse(isAbroad?: boolean): CourseData {
  return {
    courseId: 99999,
    raceTrackId: isAbroad ? 10101 : 10006,
    distance: 2000,
    distanceType: 3,
    surface: 1,
    turn: 2,
    isAbroad,
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
}

function buildApplyParams(isAbroad?: boolean): ApplyParams {
  const regions = new RegionList();
  regions.push(new Region(0, 2000));

  return {
    regions,
    course: buildCourse(isAbroad),
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
  return regions.map((r) => [r.start, r.end]);
}

describe('is_abroad condition', () => {
  it('is_abroad==1 keeps regions only on overseas courses', () => {
    const parser = createParser();
    expect(bounds(parser.parse('is_abroad==1').apply(buildApplyParams(true))[0])).toEqual([
      [0, 2000]
    ]);
    expect(bounds(parser.parse('is_abroad==1').apply(buildApplyParams(false))[0])).toEqual([]);
  });

  it('is_abroad==0 keeps regions only on domestic courses', () => {
    const parser = createParser();
    expect(bounds(parser.parse('is_abroad==0').apply(buildApplyParams(false))[0])).toEqual([
      [0, 2000]
    ]);
    expect(bounds(parser.parse('is_abroad==0').apply(buildApplyParams(true))[0])).toEqual([]);
  });

  it('treats a missing isAbroad flag as domestic', () => {
    const parser = createParser();
    expect(bounds(parser.parse('is_abroad==0').apply(buildApplyParams(undefined))[0])).toEqual([
      [0, 2000]
    ]);
  });

  it('throws for unsupported comparison values', () => {
    const parser = createParser();
    expect(() => parser.parse('is_abroad==2').apply(buildApplyParams(true))).toThrow();
  });
});
