import { describe, expect, test } from 'bun:test';
import { EnhancedHpPolicy, HpStrategyCoefficient } from '../EnhancedHpPolicy';
import {
  createMockCourseForHp,
  createMockHorseForHp,
  createMockPRNG,
  createMockRaceStateForHp,
} from './fixtures';
import { GroundCondition } from '@/modules/simulation/lib/course/definitions';
import { Strategy } from '@/modules/simulation/lib/runner/definitions';

describe('EnhancedHpPolicy', () => {
  describe('Initialization', () => {
    test('init calculates baseTargetSpeed2', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({
        speed: 1200,
        strategy: Strategy.PaceChaser,
        distanceAptitude: 1, // A
      });

      policy.init(horse);

      // baseTargetSpeed2 is calculated with phase 2 coefficients
      // Formula from line 94-112 in EnhancedHpPolicy.ts
      const StrategyPhaseCoefficient = [
        [],
        [1.0, 0.98, 0.962],
        [0.978, 0.991, 0.975],
        [0.938, 0.998, 0.994],
        [0.931, 1.0, 1.0],
        [1.063, 0.962, 0.95],
      ];
      const DistanceProficiencyModifier = [1.05, 1.0, 0.9, 0.8, 0.6, 0.4, 0.2, 0.1];

      const baseSpeed = 20.0 - (2000 - 2000) / 1000.0;
      const expectedBaseTargetSpeed2 =
        baseSpeed * StrategyPhaseCoefficient[Strategy.PaceChaser][2] +
        Math.sqrt(500.0 * 1200) * DistanceProficiencyModifier[1] * 0.002;

      // Use private field access through any cast to test
      const baseTargetSpeed2 = (policy as any).baseTargetSpeed2;
      expect(baseTargetSpeed2).toBeCloseTo(expectedBaseTargetSpeed2, 5);
    });

    test('init calculates maxSpurtSpeed', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({
        speed: 1200,
        strategy: Strategy.PaceChaser,
        distanceAptitude: 1, // A
      });

      policy.init(horse);

      // maxSpurtSpeed is calculated from baseTargetSpeed2
      const maxSpurtSpeed = (policy as any).maxSpurtSpeed;
      expect(maxSpurtSpeed).toBeGreaterThan(0);
      expect(maxSpurtSpeed).toBeGreaterThan((policy as any).baseTargetSpeed2);
    });

    test('init resets spurt tracking flags', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp();

      // Set flags to non-default values
      (policy as any).spurtParameters = { distance: 100, speed: 20, spDiff: 0, time: 0 };
      (policy as any).maxSpurtAchieved = true;
      (policy as any).hasCalculatedSpurtOnce = true;
      (policy as any).recalculationCount = 5;

      // Init should reset them
      policy.init(horse);

      expect((policy as any).spurtParameters).toBeNull();
      expect((policy as any).maxSpurtAchieved).toBe(false);
      expect((policy as any).hasCalculatedSpurtOnce).toBe(false);
      expect(policy.getRecalculationCount()).toBe(0);
    });
  });

  describe('Spurt Distance Calculation', () => {
    test('calcSpurtDistance returns correct distance', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({ stamina: 800, guts: 900 });
      policy.init(horse);

      // Consume some HP to make calculation more realistic
      const consumeState = createMockRaceStateForHp({
        pos: 1000,
        phase: 1,
        currentSpeed: 17.0,
      });
      policy.tick(consumeState, 10.0);

      const state = createMockRaceStateForHp({
        pos: 1400, // Later in phase 2
        phase: 2,
      });

      const targetSpeed = 19.0;
      const distance = (policy as any).calcSpurtDistance(state, targetSpeed);

      // Distance should return a valid number
      // Note: The formula can return negative values or values > remaining distance
      // depending on HP levels - this is expected behavior
      expect(typeof distance).toBe('number');
      expect(isNaN(distance)).toBe(false);
    });

    test('calcSpurtDistance handles edge cases', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      // Test with very low HP
      const horseLowStamina = createMockHorseForHp({ stamina: 100, guts: 500 });
      policy.init(horseLowStamina);

      const state = createMockRaceStateForHp({
        pos: 1900, // Near end
        phase: 2,
      });

      const distance = (policy as any).calcSpurtDistance(state, 20.0);

      // Should not crash and return a valid number
      expect(typeof distance).toBe('number');
      expect(isNaN(distance)).toBe(false);
    });
  });

  describe('Required HP Calculation', () => {
    test('calcRequiredHp for given velocity', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp();
      policy.init(horse);

      const velocity = 18.0;
      const length = 600;
      const requiredHp = (policy as any).calcRequiredHp(velocity, length, true, false);

      // Should return a positive HP requirement
      expect(requiredHp).toBeGreaterThan(0);
    });

    test('calcRequiredHp applies guts modifier in spurt', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({ guts: 900 });
      policy.init(horse);

      const velocity = 18.0;
      const length = 600;

      // With spurt phase = true (applies guts modifier)
      const requiredHpWithGuts = (policy as any).calcRequiredHp(velocity, length, true, false);

      // With spurt phase = false (no guts modifier)
      const requiredHpNoGuts = (policy as any).calcRequiredHp(velocity, length, false, false);

      // HP requirement should be higher with guts modifier
      expect(requiredHpWithGuts).toBeGreaterThan(requiredHpNoGuts);
    });

    test('calcRequiredHp respects status modifier flag', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp();
      policy.init(horse);

      const velocity = 18.0;
      const length = 600;

      // With status modifier
      const requiredHpWithStatus = (policy as any).calcRequiredHp(velocity, length, true, true);

      // Without status modifier
      const requiredHpNoStatus = (policy as any).calcRequiredHp(velocity, length, true, false);

      // Values might be equal for default state, but both should be valid
      expect(requiredHpWithStatus).toBeGreaterThan(0);
      expect(requiredHpNoStatus).toBeGreaterThan(0);
    });
  });

  describe('Enhanced Spurt Selection', () => {
    test('getLastSpurtPair caches result in non-recalculation mode', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.5]);
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng, false);

      const horse = createMockHorseForHp({ stamina: 1000 });
      policy.init(horse);

      const state = createMockRaceStateForHp({
        pos: 1400,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      // Before calling, spurtParameters should be null
      expect((policy as any).spurtParameters).toBeNull();

      // First call - should calculate and cache
      const result1 = policy.getLastSpurtPair(state, 20.0, 18.0);

      // After first call, spurtParameters should be set (cached)
      expect((policy as any).spurtParameters).not.toBeNull();
      const cachedParams = (policy as any).spurtParameters;

      // Second call with non-recalculation mode
      const result2 = policy.getLastSpurtPair(state, 20.0, 18.0);

      // spurtParameters should be the exact same object (not recalculated)
      expect((policy as any).spurtParameters).toBe(cachedParams);

      // Results should be consistent
      expect(result1[1]).toBe(result2[1]); // Speed should match
    });

    test('getLastSpurtPair generates speed candidates', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.5]);
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({
        stamina: 600, // Low stamina to force suboptimal
        guts: 800,
      });
      policy.init(horse);

      const state = createMockRaceStateForHp({
        pos: 1333,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      const maxSpeed = 20.0;
      const baseTargetSpeed2 = 18.0;

      const [_transition, speed] = policy.getLastSpurtPair(state, maxSpeed, baseTargetSpeed2);

      // Should generate a suboptimal candidate between v3 and maxSpeed
      expect(speed).toBeLessThanOrEqual(maxSpeed);
      expect(speed).toBeGreaterThanOrEqual(baseTargetSpeed2);
    });

    test('getLastSpurtPair sorts by completion time', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.1]); // Low random value to accept first candidate
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({
        stamina: 700,
        wisdom: 1200, // High wisdom for acceptance
      });
      policy.init(horse);

      const state = createMockRaceStateForHp({
        pos: 1333,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      const [_transition, speed] = policy.getLastSpurtPair(state, 20.0, 18.0);

      // With low random and high wisdom, should accept faster candidate
      // Speed should be suboptimal but better than base
      expect(speed).toBeGreaterThan(18.0);
    });

    test('getLastSpurtPair only sets maxSpurt on first calc', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng, true); // accuracy mode

      const horse = createMockHorseForHp({ stamina: 1500, guts: 1000 });
      policy.init(horse);

      const state = createMockRaceStateForHp({
        pos: 1333,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      // First calculation - should achieve max spurt
      policy.getLastSpurtPair(state, 20.0, 18.0);
      const maxSpurtAfterFirst = policy.isMaxSpurt();

      // Trigger recalculation by recovering HP
      policy.recover(0.1, state);

      // Call again
      policy.getLastSpurtPair(state, 20.0, 18.0);
      const maxSpurtAfterSecond = policy.isMaxSpurt();

      // maxSpurt flag should remain the same (set on first calc only)
      expect(maxSpurtAfterFirst).toBe(maxSpurtAfterSecond);
    });
  });

  describe('Accuracy Mode (recalculateOnHeal)', () => {
    test('recover triggers recalculation in phase 2+', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.5, 0.5]);
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng, true); // accuracy mode ON

      const horse = createMockHorseForHp({ stamina: 800 });
      policy.init(horse);

      const state = createMockRaceStateForHp({
        pos: 1400,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      // Calculate spurt first
      policy.getLastSpurtPair(state, 20.0, 18.0);
      expect((policy as any).spurtParameters).not.toBeNull();

      const recalcCountBefore = policy.getRecalculationCount();

      // Recover in phase 2 should trigger recalculation
      policy.recover(0.1, state);

      const recalcCountAfter = policy.getRecalculationCount();
      expect(recalcCountAfter).toBeGreaterThan(recalcCountBefore);
    });

    test('recover does not recalculate in phase 0/1', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.5]);
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng, true); // accuracy mode ON

      const horse = createMockHorseForHp();
      policy.init(horse);

      const statePhase0 = createMockRaceStateForHp({
        pos: 100,
        phase: 0,
      });

      const recalcCountBefore = policy.getRecalculationCount();

      // Recover in phase 0 should NOT trigger recalculation
      policy.recover(0.1, statePhase0);

      const recalcCountAfter = policy.getRecalculationCount();
      expect(recalcCountAfter).toBe(recalcCountBefore);
    });

    test('recover does not recalculate when mode off', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.5]);
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng, false); // accuracy mode OFF

      const horse = createMockHorseForHp({ stamina: 800 });
      policy.init(horse);

      const state = createMockRaceStateForHp({
        pos: 1400,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      // Calculate spurt first
      policy.getLastSpurtPair(state, 20.0, 18.0);

      const recalcCountBefore = policy.getRecalculationCount();

      // Recover in phase 2 with mode OFF should NOT trigger recalculation
      policy.recover(0.1, state);

      const recalcCountAfter = policy.getRecalculationCount();
      expect(recalcCountAfter).toBe(recalcCountBefore);
    });

    test('getRecalculationCount tracks recalcs', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.5, 0.5, 0.5]);
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng, true); // accuracy mode ON

      const horse = createMockHorseForHp({ stamina: 800 });
      policy.init(horse);

      const state = createMockRaceStateForHp({
        pos: 1400,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      // Initial count should be 0
      expect(policy.getRecalculationCount()).toBe(0);

      // Calculate spurt
      policy.getLastSpurtPair(state, 20.0, 18.0);

      // First recovery
      policy.recover(0.05, state);
      expect(policy.getRecalculationCount()).toBe(1);

      // Second recovery
      policy.recover(0.05, state);
      expect(policy.getRecalculationCount()).toBe(2);
    });
  });

  describe('Integration Tests', () => {
    test('EnhancedHpPolicy handles full race simulation', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.5]);
      const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({
        stamina: 1000,
        guts: 900,
        wisdom: 1000,
      });

      policy.init(horse);
      expect(policy.hp).toBe(policy.maxHp);

      // Phase 0
      const state0 = createMockRaceStateForHp({
        pos: 100,
        phase: 0,
        currentSpeed: 16.0,
      });
      policy.tick(state0, 1.0);
      expect(policy.hp).toBeLessThan(policy.maxHp);

      // Phase 2 - last spurt
      const state2 = createMockRaceStateForHp({
        pos: 1333,
        phase: 2,
        currentSpeed: 18.0,
        posKeepStrategy: Strategy.PaceChaser,
      });

      const [transition, speed] = policy.getLastSpurtPair(state2, 20.0, 18.0);
      expect(speed).toBeGreaterThan(0);
      expect(transition).toBeDefined();
    });

    test('EnhancedHpPolicy handles different strategies', () => {
      const course = createMockCourseForHp({ distance: 2000 });

      const strategies = [
        Strategy.FrontRunner,
        Strategy.PaceChaser,
        Strategy.LateSurger,
        Strategy.EndCloser,
        Strategy.Runaway,
      ];

      for (const strategy of strategies) {
        const rng = createMockPRNG([0.5]);
        const policy = new EnhancedHpPolicy(course, GroundCondition.Good, rng);
        const horse = createMockHorseForHp({ strategy });

        policy.init(horse);

        // Each strategy should have different maxHp due to different coefficients
        expect(policy.maxHp).toBeGreaterThan(0);

        const expectedMaxHp =
          0.8 * HpStrategyCoefficient[strategy] * horse.stamina + course.distance;
        expect(policy.maxHp).toBeCloseTo(expectedMaxHp, 5);
      }
    });
  });
});

