import { describe, expect, test } from 'bun:test';
import { defaultConditions } from '../conditions';
import { Region, RegionList } from '../../../../utils/Region';
import { ImmediatePolicy, RandomPolicy } from '../../../policies/ActivationSamplePolicy';
import { Strategy } from '../../../../runner/definitions';
import {
  DistanceType,
  GroundCondition,
  Orientation,
  Season,
  Surface,
  Weather,
} from '../../../../course/definitions';
import {
  createMockCourse,
  createMockHorse,
  createMockRaceParams,
  createMockRaceState,
  createWholeRegion,
} from './fixtures';

describe('defaultConditions', () => {
  describe('always', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.always.samplePolicy).toBe(ImmediatePolicy);
    });

    test('returns regions unchanged for all filters', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      expect(defaultConditions.always.filterEq(regions, 1, course, horse, params)).toBe(regions);
      expect(defaultConditions.always.filterNeq(regions, 1, course, horse, params)).toBe(regions);
      expect(defaultConditions.always.filterLt(regions, 1, course, horse, params)).toBe(regions);
      expect(defaultConditions.always.filterLte(regions, 1, course, horse, params)).toBe(regions);
      expect(defaultConditions.always.filterGt(regions, 1, course, horse, params)).toBe(regions);
      expect(defaultConditions.always.filterGte(regions, 1, course, horse, params)).toBe(regions);
    });
  });

  describe('phase', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.phase.samplePolicy).toBe(ImmediatePolicy);
    });

    test('filterEq restricts to phase 0 (early race)', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.phase.filterEq(regions, 0, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(result).toBeInstanceOf(RegionList);
      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(0);
      // Phase 0: 0 to 1/6 of distance = 0 to 333.33m
      expect(resultRegions[0].end).toBeCloseTo(333.33, 1);
    });

    test('filterEq restricts to phase 1 (mid race)', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.phase.filterEq(regions, 1, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(result).toBeInstanceOf(RegionList);
      expect(result.length).toBe(1);
      // Phase 1: 1/6 to 2/3 = 333.33m to 1333.33m
      expect(resultRegions[0].start).toBeCloseTo(333.33, 1);
      expect(resultRegions[0].end).toBeCloseTo(1333.33, 1);
    });

    test('filterEq restricts to phase 2 (late race)', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.phase.filterEq(regions, 2, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(result).toBeInstanceOf(RegionList);
      expect(resultRegions.length).toBe(1);
      // Phase 2: 2/3 to 5/6 = 1333.33m to 1666.67m
      expect(resultRegions[0].start).toBeCloseTo(1333.33, 1);
      expect(resultRegions[0].end).toBeCloseTo(1666.67, 1);
    });

    test('filterLt restricts to before phase', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.phase.filterLt(regions, 2, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(result).toBeInstanceOf(RegionList);
      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(0);
      expect(resultRegions[0].end).toBeCloseTo(1333.33, 1); // Before phase 2
    });

    test('filterGte restricts to phase and after', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.phase.filterGte(regions, 1, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(result).toBeInstanceOf(RegionList);
      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBeCloseTo(333.33, 1); // Phase 1 start
      expect(resultRegions[0].end).toBe(2000);
    });
  });

  describe('distance_type', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.distance_type.samplePolicy).toBe(ImmediatePolicy);
    });

    test('filterEq returns regions when distance type matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ distanceType: DistanceType.Mid });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.distance_type.filterEq(
        regions,
        DistanceType.Mid,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });

    test('filterEq returns empty regions when distance type does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ distanceType: DistanceType.Mid });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.distance_type.filterEq(
        regions,
        DistanceType.Long,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(0);
    });

    test('filterNeq returns regions when distance type does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ distanceType: DistanceType.Mid });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.distance_type.filterNeq(
        regions,
        DistanceType.Long,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });
  });

  describe('distance_rate', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.distance_rate.samplePolicy).toBe(ImmediatePolicy);
    });

    test('filterLte restricts to first portion of race', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      // distance_rate<=50 means first 50% of race
      const result = defaultConditions.distance_rate.filterLte(regions, 50, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(0);
      expect(resultRegions[0].end).toBe(1000); // 50% of 2000m
    });

    test('filterGte restricts to last portion of race', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      // distance_rate>=75 means last 25% of race
      const result = defaultConditions.distance_rate.filterGte(regions, 75, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(1500); // 75% of 2000m
      expect(resultRegions[0].end).toBe(2000);
    });
  });

  describe('remain_distance', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.remain_distance.samplePolicy).toBe(ImmediatePolicy);
    });

    test('filterEq restricts to specific remaining distance', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      // remain_distance==200 means 200m from finish
      const result = defaultConditions.remain_distance.filterEq(
        regions,
        200,
        course,
        horse,
        params,
      );

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(1800); // 2000 - 200
      expect(resultRegions[0].end).toBe(1801); // 1m window
    });

    test('filterLte restricts to last portion by remaining distance', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      // remain_distance<=500 means last 500m
      const result = defaultConditions.remain_distance.filterLte(
        regions,
        500,
        course,
        horse,
        params,
      );

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(1500); // 2000 - 500
      expect(resultRegions[0].end).toBe(2000);
    });

    test('filterGte restricts to first portion by remaining distance', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      // remain_distance>=1500 means first 500m (1500m+ remaining)
      const result = defaultConditions.remain_distance.filterGte(
        regions,
        1500,
        course,
        horse,
        params,
      );

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(0);
      expect(resultRegions[0].end).toBe(500); // 2000 - 1500
    });
  });

  describe('corner', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.corner.samplePolicy).toBe(ImmediatePolicy);
    });

    test('filterEq with 0 returns non-corner regions', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        corners: [
          { start: 200, length: 150 },
          { start: 500, length: 150 },
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.corner.filterEq(regions, 0, course, horse, params);

      // Should return regions that are NOT corners
      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBeGreaterThan(0);
      // First non-corner: [0, 200)
      expect(resultRegions[0].start).toBe(0);
      expect(resultRegions[0].end).toBe(200);
    });

    test('filterEq with corner number returns specific corners', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        corners: [
          { start: 200, length: 150 },
          { start: 500, length: 150 },
          { start: 1000, length: 150 },
          { start: 1400, length: 150 },
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      // corner==1 with 4 corners: 4 + 1 = 5, 5 >= 5, so corner at index 0 (200-350)
      const result = defaultConditions.corner.filterEq(regions, 1, course, horse, params);
      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(200);
      expect(resultRegions[0].end).toBe(350);
    });

    test('filterNeq with 0 returns corner regions', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        corners: [
          { start: 200, length: 150 },
          { start: 500, length: 150 },
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.corner.filterNeq(regions, 0, course, horse, params);

      // Should return corner regions
      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(2);
      expect(resultRegions[0].start).toBe(200);
      expect(resultRegions[0].end).toBe(350);
    });
  });

  describe('straight_random', () => {
    test('has StraightRandomPolicy', () => {
      expect(defaultConditions.straight_random.samplePolicy).toBeDefined();
      // StraightRandomPolicy is an object, not a class
      expect(typeof defaultConditions.straight_random.samplePolicy).toBe('object');
    });

    test('filterEq restricts to straight sections', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        straights: [
          { start: 0, end: 200, frontType: 1 },
          { start: 1550, end: 2000, frontType: 1 },
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.straight_random.filterEq(regions, 1, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(2);
      expect(resultRegions[0].start).toBe(0);
      expect(resultRegions[0].end).toBe(200);
      expect(resultRegions[1].start).toBe(1550);
      expect(resultRegions[1].end).toBe(2000);
    });

    test('throws error when argument is not 1', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      expect(() =>
        defaultConditions.straight_random.filterEq(regions, 2, course, horse, params),
      ).toThrow('must be straight_random==1');
    });
  });

  describe('slope', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.slope.samplePolicy).toBe(ImmediatePolicy);
    });

    test('filterEq with 0 returns flat sections', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        slopes: [
          { start: 100, length: 80, slope: 2 }, // uphill
          { start: 300, length: 50, slope: -1.5 }, // downhill
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.slope.filterEq(regions, 0, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      // Should return non-slope regions
      expect(result.length).toBeGreaterThan(0);
      expect(resultRegions[0].start).toBe(0);
      expect(resultRegions[0].end).toBe(100);
    });

    test('filterEq with 1 returns uphill sections', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        slopes: [
          { start: 100, length: 80, slope: 2 }, // uphill
          { start: 300, length: 50, slope: -1.5 }, // downhill
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.slope.filterEq(regions, 1, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(100);
      expect(resultRegions[0].end).toBe(180);
    });

    test('filterEq with 2 returns downhill sections', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        slopes: [
          { start: 100, length: 80, slope: 2 }, // uphill
          { start: 300, length: 50, slope: -1.5 }, // downhill
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.slope.filterEq(regions, 2, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(300);
      expect(resultRegions[0].end).toBe(350);
    });
  });

  describe('running_style', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.running_style.samplePolicy).toBe(ImmediatePolicy);
    });

    test('filterEq returns regions when strategy matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse({ strategy: Strategy.PaceChaser });
      const params = createMockRaceParams();

      const result = defaultConditions.running_style.filterEq(
        regions,
        Strategy.PaceChaser,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });

    test('filterEq returns empty regions when strategy does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse({ strategy: Strategy.PaceChaser });
      const params = createMockRaceParams();

      const result = defaultConditions.running_style.filterEq(
        regions,
        Strategy.FrontRunner,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(0);
    });
  });

  describe('ground_type', () => {
    test('returns regions when surface matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ surface: Surface.Turf });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.ground_type.filterEq(
        regions,
        Surface.Turf,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });

    test('returns empty regions when surface does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ surface: Surface.Turf });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.ground_type.filterEq(
        regions,
        Surface.Dirt,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(0);
    });
  });

  describe('ground_condition', () => {
    test('returns regions when ground condition matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ groundCondition: GroundCondition.Good });

      const result = defaultConditions.ground_condition.filterEq(
        regions,
        GroundCondition.Good,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });

    test('returns empty regions when ground condition does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ groundCondition: GroundCondition.Good });

      const result = defaultConditions.ground_condition.filterEq(
        regions,
        GroundCondition.Heavy,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(0);
    });
  });

  describe('weather', () => {
    test('returns regions when weather matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ weather: Weather.Sunny });

      const result = defaultConditions.weather.filterEq(
        regions,
        Weather.Sunny,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });

    test('returns empty regions when weather does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ weather: Weather.Sunny });

      const result = defaultConditions.weather.filterEq(
        regions,
        Weather.Rainy,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(0);
    });
  });

  describe('season', () => {
    test('returns regions when season matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ season: Season.Spring });

      const result = defaultConditions.season.filterEq(
        regions,
        Season.Spring,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });

    test('returns empty regions when season does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ season: Season.Spring });

      const result = defaultConditions.season.filterEq(
        regions,
        Season.Winter,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(0);
    });
  });

  describe('rotation', () => {
    test('returns regions when turn direction matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ turn: Orientation.Counterclockwise });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.rotation.filterEq(
        regions,
        Orientation.Counterclockwise,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });

    test('returns empty regions when turn direction does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ turn: Orientation.Counterclockwise });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.rotation.filterEq(
        regions,
        Orientation.Clockwise,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(0);
    });
  });

  describe('course_distance', () => {
    test('returns regions when course distance matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.course_distance.filterEq(
        regions,
        2000,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(1);
    });

    test('returns empty regions when course distance does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.course_distance.filterEq(
        regions,
        1800,
        course,
        horse,
        params,
      );

      expect(result.length).toBe(0);
    });
  });

  describe('track_id', () => {
    test('returns regions when track ID matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ raceTrackId: 10101 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.track_id.filterEq(regions, 10101, course, horse, params);

      expect(result.length).toBe(1);
    });

    test('returns empty regions when track ID does not match', () => {
      const regions = createWholeRegion();
      const course = createMockCourse({ raceTrackId: 10101 });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.track_id.filterEq(regions, 10201, course, horse, params);

      expect(result.length).toBe(0);
    });
  });

  describe('base stat conditions', () => {
    test('base_speed returns regions when speed matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse({ speed: 1200 });
      const params = createMockRaceParams();

      const result = defaultConditions.base_speed.filterEq(regions, 1200, course, horse, params);

      expect(result.length).toBe(1);
    });

    test('base_power returns regions when power matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse({ power: 1100 });
      const params = createMockRaceParams();

      const result = defaultConditions.base_power.filterEq(regions, 1100, course, horse, params);

      expect(result.length).toBe(1);
    });

    test('base_stamina returns regions when stamina matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse({ stamina: 1000 });
      const params = createMockRaceParams();

      const result = defaultConditions.base_stamina.filterEq(regions, 1000, course, horse, params);

      expect(result.length).toBe(1);
    });

    test('base_guts returns regions when guts matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse({ guts: 900 });
      const params = createMockRaceParams();

      const result = defaultConditions.base_guts.filterEq(regions, 900, course, horse, params);

      expect(result.length).toBe(1);
    });

    test('base_wiz returns regions when wisdom matches', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse({ wisdom: 1000 });
      const params = createMockRaceParams();

      const result = defaultConditions.base_wiz.filterEq(regions, 1000, course, horse, params);

      expect(result.length).toBe(1);
    });
  });

  describe('Dynamic conditions', () => {
    describe('hp_per', () => {
      test('has ImmediatePolicy', () => {
        expect(defaultConditions.hp_per.samplePolicy).toBe(ImmediatePolicy);
      });

      test('filterLte returns regions and dynamic condition', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const result = defaultConditions.hp_per.filterLte(regions, 50, course, horse, params);

        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toBeInstanceOf(RegionList);
        expect(typeof result[1]).toBe('function');
      });

      test('dynamic condition checks HP ratio correctly', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.hp_per.filterLte(
          regions,
          50,
          course,
          horse,
          params,
        ) as any;

        // HP at 60% should fail <=50% check
        const state1 = createMockRaceState({
          hp: { hpRatioRemaining: () => 0.6 },
        });
        expect(dynamicCond(state1)).toBe(false);

        // HP at 40% should pass <=50% check
        const state2 = createMockRaceState({
          hp: { hpRatioRemaining: () => 0.4 },
        });
        expect(dynamicCond(state2)).toBe(true);
      });

      test('filterGte dynamic condition checks HP ratio correctly', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.hp_per.filterGte(
          regions,
          80,
          course,
          horse,
          params,
        ) as any;

        // HP at 90% should pass >=80% check
        const state1 = createMockRaceState({
          hp: { hpRatioRemaining: () => 0.9 },
        });
        expect(dynamicCond(state1)).toBe(true);

        // HP at 70% should fail >=80% check
        const state2 = createMockRaceState({
          hp: { hpRatioRemaining: () => 0.7 },
        });
        expect(dynamicCond(state2)).toBe(false);
      });
    });

    describe('accumulatetime', () => {
      test('has ImmediatePolicy', () => {
        expect(defaultConditions.accumulatetime.samplePolicy).toBe(ImmediatePolicy);
      });

      test('filterGte returns regions and dynamic condition', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const result = defaultConditions.accumulatetime.filterGte(
          regions,
          10,
          course,
          horse,
          params,
        );

        expect(Array.isArray(result)).toBe(true);
        expect(result[0]).toBeInstanceOf(RegionList);
        expect(typeof result[1]).toBe('function');
      });

      test('dynamic condition checks accumulated time correctly', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.accumulatetime.filterGte(
          regions,
          10,
          course,
          horse,
          params,
        ) as any;

        // Time at 15s should pass >=10s check
        const state1 = createMockRaceState({
          accumulatetime: { t: 15 },
        });
        expect(dynamicCond(state1)).toBe(true);

        // Time at 5s should fail >=10s check
        const state2 = createMockRaceState({
          accumulatetime: { t: 5 },
        });
        expect(dynamicCond(state2)).toBe(false);
      });
    });

    describe('is_lastspurt', () => {
      test('has ImmediatePolicy', () => {
        expect(defaultConditions.is_lastspurt.samplePolicy).toBe(ImmediatePolicy);
      });

      test('filterEq restricts to phase 2 and returns dynamic condition', () => {
        const regions = createWholeRegion(2000);
        const course = createMockCourse({ distance: 2000 });
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const result = defaultConditions.is_lastspurt.filterEq(regions, 1, course, horse, params);

        expect(Array.isArray(result)).toBe(true);
        const [resultRegions, dynamicCond] = result as any;
        expect(resultRegions.length).toBe(1);
        expect(resultRegions[0].start).toBeCloseTo(1333.33, 1); // Phase 2 start (2/3 of 2000)
        expect(typeof dynamicCond).toBe('function');
      });

      test('dynamic condition checks isLastSpurt flag', () => {
        const regions = createWholeRegion(2000);
        const course = createMockCourse({ distance: 2000 });
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.is_lastspurt.filterEq(
          regions,
          1,
          course,
          horse,
          params,
        ) as any;

        const state1 = createMockRaceState({ isLastSpurt: true });
        expect(dynamicCond(state1)).toBe(true);

        const state2 = createMockRaceState({ isLastSpurt: false });
        expect(dynamicCond(state2)).toBe(false);
      });

      test('throws error when argument is not 1', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        expect(() =>
          defaultConditions.is_lastspurt.filterEq(regions, 0, course, horse, params),
        ).toThrow('must be is_lastspurt==1');
      });
    });

    describe('is_badstart', () => {
      test('has ImmediatePolicy', () => {
        expect(defaultConditions.is_badstart.samplePolicy).toBe(ImmediatePolicy);
      });

      test('filterEq with 1 returns dynamic condition for bad start', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const result = defaultConditions.is_badstart.filterEq(regions, 1, course, horse, params);

        expect(Array.isArray(result)).toBe(true);
        const [_, dynamicCond] = result as any;
        expect(typeof dynamicCond).toBe('function');

        // Bad start: delay > 0.08
        const state1 = createMockRaceState({ startDelay: 0.1 });
        expect(dynamicCond(state1)).toBe(true);

        const state2 = createMockRaceState({ startDelay: 0.05 });
        expect(dynamicCond(state2)).toBe(false);
      });

      test('filterEq with 0 returns dynamic condition for good start', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const result = defaultConditions.is_badstart.filterEq(regions, 0, course, horse, params);

        expect(Array.isArray(result)).toBe(true);
        const [_, dynamicCond] = result as any;

        // Good start: delay <= 0.08
        const state1 = createMockRaceState({ startDelay: 0.05 });
        expect(dynamicCond(state1)).toBe(true);

        const state2 = createMockRaceState({ startDelay: 0.1 });
        expect(dynamicCond(state2)).toBe(false);
      });
    });

    describe('activate_count conditions', () => {
      test('activate_count_all checks total activation count', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.activate_count_all.filterGte(
          regions,
          5,
          course,
          horse,
          params,
        ) as any;

        const state1 = createMockRaceState({ activateCount: [2, 2, 2] }); // Total: 6
        expect(dynamicCond(state1)).toBe(true);

        const state2 = createMockRaceState({ activateCount: [1, 1, 1] }); // Total: 3
        expect(dynamicCond(state2)).toBe(false);
      });

      test('activate_count_start checks phase 0 activations', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.activate_count_start.filterGte(
          regions,
          3,
          course,
          horse,
          params,
        ) as any;

        const state1 = createMockRaceState({ activateCount: [4, 0, 0] });
        expect(dynamicCond(state1)).toBe(true);

        const state2 = createMockRaceState({ activateCount: [2, 0, 0] });
        expect(dynamicCond(state2)).toBe(false);
      });

      test('activate_count_middle checks phase 1 activations', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.activate_count_middle.filterGte(
          regions,
          2,
          course,
          horse,
          params,
        ) as any;

        const state1 = createMockRaceState({ activateCount: [0, 3, 0] });
        expect(dynamicCond(state1)).toBe(true);

        const state2 = createMockRaceState({ activateCount: [0, 1, 0] });
        expect(dynamicCond(state2)).toBe(false);
      });

      test('activate_count_end_after checks phase 2 activations', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.activate_count_end_after.filterGte(
          regions,
          1,
          course,
          horse,
          params,
        ) as any;

        const state1 = createMockRaceState({ activateCount: [0, 0, 2] });
        expect(dynamicCond(state1)).toBe(true);

        const state2 = createMockRaceState({ activateCount: [0, 0, 0] });
        expect(dynamicCond(state2)).toBe(false);
      });
    });

    describe('random_lot', () => {
      test('has ImmediatePolicy', () => {
        expect(defaultConditions.random_lot.samplePolicy).toBe(ImmediatePolicy);
      });

      test('filterEq returns dynamic condition that checks random lot', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams();

        const [_, dynamicCond] = defaultConditions.random_lot.filterEq(
          regions,
          50,
          course,
          horse,
          params,
        ) as any;

        const state1 = createMockRaceState({ randomLot: 30 });
        expect(dynamicCond(state1)).toBe(true); // 30 < 50

        const state2 = createMockRaceState({ randomLot: 60 });
        expect(dynamicCond(state2)).toBe(false); // 60 >= 50
      });
    });

    describe('post_number', () => {
      test('has ImmediatePolicy', () => {
        expect(defaultConditions.post_number.samplePolicy).toBe(ImmediatePolicy);
      });

      test('filterEq returns dynamic condition that checks gate position', () => {
        const regions = createWholeRegion();
        const course = createMockCourse();
        const horse = createMockHorse();
        const params = createMockRaceParams({ numUmas: 9 });

        const result = defaultConditions.post_number.filterEq(regions, 5, course, horse, params);

        expect(Array.isArray(result)).toBe(true);
        const [_, dynamicCond] = result as any;
        expect(typeof dynamicCond).toBe('function');
      });
    });
  });

  describe('order conditions', () => {
    test('order filterEq uses orderRange', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ orderRange: [3, 7], numUmas: 18 });

      const result = defaultConditions.order.filterEq(regions, 5, course, horse, params);

      expect(result.length).toBe(1);
    });

    test('order filterEq returns empty when position out of range', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ orderRange: [3, 7], numUmas: 18 });

      const result = defaultConditions.order.filterEq(regions, 10, course, horse, params);

      expect(result.length).toBe(0);
    });

    test('order_rate converts percentage to position', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams({ orderRange: [3, 7], numUmas: 18 });

      // order_rate==50 with 18 horses = position 9
      const result = defaultConditions.order_rate.filterEq(regions, 50, course, horse, params);

      expect(result.length).toBe(0); // Position 9 is outside [3, 7]
    });
  });

  describe('is_finalcorner', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.is_finalcorner.samplePolicy).toBe(ImmediatePolicy);
    });

    test('filterEq with 1 restricts to final corner onwards', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        corners: [
          { start: 200, length: 150 },
          { start: 500, length: 150 },
          { start: 1400, length: 150 },
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.is_finalcorner.filterEq(regions, 1, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(1400); // Final corner start
      expect(resultRegions[0].end).toBe(2000);
    });

    test('filterEq with 0 restricts to before final corner', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        corners: [
          { start: 200, length: 150 },
          { start: 500, length: 150 },
          { start: 1400, length: 150 },
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.is_finalcorner.filterEq(regions, 0, course, horse, params);

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(0);
      expect(resultRegions[0].end).toBe(1400); // Before final corner
    });
  });

  describe('is_last_straight_onetime', () => {
    test('has ImmediatePolicy', () => {
      expect(defaultConditions.is_last_straight_onetime.samplePolicy).toBe(ImmediatePolicy);
    });

    test('restricts to small window at start of last straight', () => {
      const regions = createWholeRegion(2000);
      const course = createMockCourse({
        distance: 2000,
        straights: [
          { start: 0, end: 200, frontType: 1 },
          { start: 1550, end: 2000, frontType: 1 },
        ],
      });
      const horse = createMockHorse();
      const params = createMockRaceParams();

      const result = defaultConditions.is_last_straight_onetime.filterEq(
        regions,
        1,
        course,
        horse,
        params,
      );

      const resultRegions = result instanceof RegionList ? result : result[0];

      expect(resultRegions.length).toBe(1);
      expect(resultRegions[0].start).toBe(1550);
      expect(resultRegions[0].end).toBe(1560); // 10m window
    });

    test('throws error when argument is not 1', () => {
      const regions = createWholeRegion();
      const course = createMockCourse();
      const horse = createMockHorse();
      const params = createMockRaceParams();

      expect(() =>
        defaultConditions.is_last_straight_onetime.filterEq(regions, 0, course, horse, params),
      ).toThrow('must be is_last_straight_onetime==1');
    });
  });
});
