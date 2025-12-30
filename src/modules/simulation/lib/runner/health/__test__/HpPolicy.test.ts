import { describe, expect, test } from 'bun:test';
import { GameHpPolicy, HpConsumptionGroundModifier, HpStrategyCoefficient } from '../HpPolicy';
import {
  createMockCourseForHp,
  createMockHorseForHp,
  createMockPRNG,
  createMockRaceStateForHp,
} from './fixtures';
import { GroundCondition } from '@/modules/simulation/lib/course/definitions';
import { Strategy } from '@/modules/simulation/lib/runner/definitions';
import { PositionKeepState } from '@/modules/simulation/lib/skills/definitions';

describe('GameHpPolicy', () => {
  describe('Initialization', () => {
    test('init sets maxHp correctly', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({
        stamina: 1000,
        strategy: Strategy.PaceChaser,
      });

      policy.init(horse);

      // Formula: 0.8 * HpStrategyCoefficient[strategy] * stamina + distance
      // 0.8 * 0.89 * 1000 + 2000 = 712 + 2000 = 2712
      const expectedMaxHp = 0.8 * HpStrategyCoefficient[Strategy.PaceChaser] * 1000 + 2000;
      expect(policy.maxHp).toBeCloseTo(expectedMaxHp, 5);
    });

    test('init sets hp to maxHp', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp();
      policy.init(horse);

      expect(policy.hp).toBe(policy.maxHp);
    });

    test('init calculates gutsModifier', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({ guts: 900 });
      policy.init(horse);

      // Formula: 1.0 + 200.0 / sqrt(600.0 * guts)
      // 1.0 + 200.0 / sqrt(600.0 * 900) = 1.0 + 200.0 / sqrt(540000)
      const expectedGutsModifier = 1.0 + 200.0 / Math.sqrt(600.0 * 900);
      expect(policy.gutsModifier).toBeCloseTo(expectedGutsModifier, 5);
    });

    test('init calculates subparAcceptChance', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      const horse = createMockHorseForHp({ wisdom: 1000 });
      policy.init(horse);

      // Formula: round((15.0 + 0.05 * wisdom) * 1000)
      // round((15.0 + 0.05 * 1000) * 1000) = round((15.0 + 50.0) * 1000) = 65000
      const expectedSubparAcceptChance = Math.round((15.0 + 0.05 * 1000) * 1000);
      expect(policy.subparAcceptChance).toBe(expectedSubparAcceptChance);
    });

    test('constructor sets baseSpeed', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      // Formula: 20.0 - (distance - 2000) / 1000.0
      // 20.0 - (2000 - 2000) / 1000.0 = 20.0
      const expectedBaseSpeed = 20.0 - (2000 - 2000) / 1000.0;
      expect(policy.baseSpeed).toBe(expectedBaseSpeed);
    });

    test('constructor sets groundModifier', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();

      // Test different ground conditions
      const policyGood = new GameHpPolicy(course, GroundCondition.Good, rng);
      expect(policyGood.groundModifier).toBe(
        HpConsumptionGroundModifier[course.surface][GroundCondition.Good],
      );

      const policySoft = new GameHpPolicy(course, GroundCondition.Soft, rng);
      expect(policySoft.groundModifier).toBe(
        HpConsumptionGroundModifier[course.surface][GroundCondition.Soft],
      );
    });
  });

  describe('HP Consumption (tick)', () => {
    test('tick reduces HP by consumption rate', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);
      const initialHp = policy.hp;

      const state = createMockRaceStateForHp({
        currentSpeed: 15.0,
        phase: 0,
        positionKeepState: PositionKeepState.None,
      });

      policy.tick(state, 0.1); // tick for 0.1 seconds

      expect(policy.hp).toBeLessThan(initialHp);
    });

    test('tick uses correct velocity-based formula', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);
      const initialHp = policy.hp;

      const velocity = 18.0;
      const state = createMockRaceStateForHp({
        currentSpeed: velocity,
        phase: 0,
        positionKeepState: PositionKeepState.None,
      });

      policy.tick(state, 1.0); // tick for 1 second

      // Formula: (20 * (v - baseSpeed + 12)² / 144) * modifiers
      const baseSpeed = policy.baseSpeed;
      const expectedConsumption =
        ((20.0 * Math.pow(velocity - baseSpeed + 12.0, 2)) / 144.0) *
        1.0 * // getStatusModifier returns 1.0 for default state
        policy.groundModifier *
        1.0; // gutsModifier is 1.0 in phase 0

      expect(policy.hp).toBeCloseTo(initialHp - expectedConsumption, 5);
    });

    test('tick applies guts modifier only in phase 2+', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp({ guts: 900 });

      policy.init(horse);

      // Test phase 0 (no guts modifier)
      const state0 = createMockRaceStateForHp({
        currentSpeed: 15.0,
        phase: 0,
        positionKeepState: PositionKeepState.None,
      });
      const consumption0 = policy.hpPerSecond(state0, 15.0);

      // Test phase 2 (guts modifier applies)
      const state2 = createMockRaceStateForHp({
        currentSpeed: 15.0,
        phase: 2,
        positionKeepState: PositionKeepState.None,
      });
      const consumption2 = policy.hpPerSecond(state2, 15.0);

      // Consumption in phase 2 should be higher due to guts modifier > 1.0
      expect(consumption2).toBeGreaterThan(consumption0);
      expect(consumption2 / consumption0).toBeCloseTo(policy.gutsModifier, 5);
    });

    test('tick applies ground modifier', () => {
      const course = createMockCourseForHp();
      const rngGood = createMockPRNG();
      const rngHeavy = createMockPRNG();

      const policyGood = new GameHpPolicy(course, GroundCondition.Good, rngGood);
      const policyHeavy = new GameHpPolicy(course, GroundCondition.Heavy, rngHeavy);

      const horse = createMockHorseForHp();
      policyGood.init(horse);
      policyHeavy.init(horse);

      const state = createMockRaceStateForHp({
        currentSpeed: 15.0,
        phase: 0,
        positionKeepState: PositionKeepState.None,
      });

      const consumptionGood = policyGood.hpPerSecond(state, 15.0);
      const consumptionHeavy = policyHeavy.hpPerSecond(state, 15.0);

      // Heavy ground should consume more HP
      expect(consumptionHeavy).toBeGreaterThan(consumptionGood);
    });
  });

  describe('Status Modifiers', () => {
    test('getStatusModifier returns 1.0 for default state', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      const state = {
        positionKeepState: PositionKeepState.None,
        isRushed: false,
        isDownhillMode: false,
        leadCompetition: false,
      };

      expect(policy.getStatusModifier(state)).toBe(1.0);
    });

    test('getStatusModifier applies downhill modifier (0.4)', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      const state = {
        positionKeepState: PositionKeepState.None,
        isRushed: false,
        isDownhillMode: true,
        leadCompetition: false,
      };

      expect(policy.getStatusModifier(state)).toBe(0.4);
    });

    test('getStatusModifier applies rushed modifier (1.6)', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      const state = {
        positionKeepState: PositionKeepState.None,
        isRushed: true,
        isDownhillMode: false,
        leadCompetition: false,
      };

      expect(policy.getStatusModifier(state)).toBe(1.6);
    });

    test('getStatusModifier applies paceDown modifier (0.6)', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      const state = {
        positionKeepState: PositionKeepState.PaceDown,
        isRushed: false,
        isDownhillMode: false,
        leadCompetition: false,
      };

      expect(policy.getStatusModifier(state)).toBe(0.6);
    });

    test('getStatusModifier stacks modifiers correctly', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      // Test: rushed + paceDown
      const state = {
        positionKeepState: PositionKeepState.PaceDown,
        isRushed: true,
        isDownhillMode: false,
        leadCompetition: false,
      };

      // Expected: 1.6 (rushed) * 0.6 (paceDown) = 0.96
      expect(policy.getStatusModifier(state)).toBeCloseTo(1.6 * 0.6, 5);
    });

    test('getStatusModifier handles lead competition', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);

      // Test FrontRunner with leadCompetition (not rushed)
      const stateFrontRunner = {
        positionKeepState: PositionKeepState.None,
        isRushed: false,
        isDownhillMode: false,
        leadCompetition: true,
        posKeepStrategy: Strategy.FrontRunner,
      };

      // Expected: 1.4 for non-Runaway front runner without rush
      expect(policy.getStatusModifier(stateFrontRunner)).toBeCloseTo(1.4, 5);

      // Test Runaway with leadCompetition and rushed
      const stateRunaway = {
        positionKeepState: PositionKeepState.None,
        isRushed: true,
        isDownhillMode: false,
        leadCompetition: true,
        posKeepStrategy: Strategy.Runaway,
      };

      // Expected: 7.7 for Runaway with rush
      expect(policy.getStatusModifier(stateRunaway)).toBeCloseTo(7.7, 5);
    });
  });

  describe('Recovery', () => {
    test('recover increases HP by modifier * maxHp', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);
      const initialHp = policy.hp;

      // Consume some HP first
      const state = createMockRaceStateForHp({ currentSpeed: 15.0 });
      policy.tick(state, 5.0); // consume HP for 5 seconds

      const hpAfterConsumption = policy.hp;
      expect(hpAfterConsumption).toBeLessThan(initialHp);

      // Recover 10% of maxHp
      policy.recover(0.1);

      const expectedHp = Math.min(hpAfterConsumption + policy.maxHp * 0.1, policy.maxHp);
      expect(policy.hp).toBeCloseTo(expectedHp, 5);
    });

    test('recover caps HP at maxHp', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);

      // Try to recover beyond maxHp
      policy.recover(0.5); // recover 50% on top of 100%

      expect(policy.hp).toBe(policy.maxHp);
    });

    test('recover handles negative HP before recovery', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);

      // Force HP to go negative
      policy.hp = -100;

      // Recover
      policy.recover(0.2); // recover 20% of maxHp

      const expectedHp = -100 + policy.maxHp * 0.2;
      expect(policy.hp).toBeCloseTo(expectedHp, 5);
    });
  });

  describe('HP Status Checks', () => {
    test('hasRemainingHp returns true when hp > 0', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);
      policy.hp = 100;

      expect(policy.hasRemainingHp()).toBe(true);
    });

    test('hasRemainingHp returns false when hp <= 0', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);
      policy.hp = 0;

      expect(policy.hasRemainingHp()).toBe(false);

      policy.hp = -10;
      expect(policy.hasRemainingHp()).toBe(false);
    });

    test('hpRatioRemaining returns correct ratio', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);

      // Test 50% HP
      policy.hp = policy.maxHp * 0.5;
      expect(policy.hpRatioRemaining()).toBeCloseTo(0.5, 5);

      // Test 25% HP
      policy.hp = policy.maxHp * 0.25;
      expect(policy.hpRatioRemaining()).toBeCloseTo(0.25, 5);
    });

    test('hpRatioRemaining clamps to 0 minimum', () => {
      const course = createMockCourseForHp();
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp();

      policy.init(horse);
      policy.hp = -100; // negative HP

      expect(policy.hpRatioRemaining()).toBe(0.0);
    });
  });

  describe('Last Spurt Calculation', () => {
    test('getLastSpurtPair returns max speed when HP sufficient', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp({ stamina: 1500, guts: 1000 });

      policy.init(horse);

      const state = createMockRaceStateForHp({
        pos: 1333, // phase 2 start
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      const maxSpeed = 20.0;
      const baseTargetSpeed2 = 18.0;

      const [transition, speed] = policy.getLastSpurtPair(state, maxSpeed, baseTargetSpeed2);

      expect(transition).toBe(-1);
      expect(speed).toBe(maxSpeed);
      expect(policy.isMaxSpurt()).toBe(true);
    });

    test('getLastSpurtPair calculates suboptimal speeds', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG([0.5]);
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp({
        stamina: 1000,
        guts: 900,
      });

      policy.init(horse);
      // Manually set HP low to force suboptimal path
      policy.hp = 500;

      const state = createMockRaceStateForHp({
        pos: 1333, // phase 2 start
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      const maxSpeed = 20.0;
      const baseTargetSpeed2 = 18.0;

      const [_transition, speed] = policy.getLastSpurtPair(state, maxSpeed, baseTargetSpeed2);

      // Should return a suboptimal speed
      expect(speed).toBeLessThan(maxSpeed);
      expect(speed).toBeGreaterThanOrEqual(baseTargetSpeed2);
      expect(policy.isMaxSpurt()).toBe(false);
    });

    test('getLastSpurtPair uses wisdom-based acceptance', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      // Use a low random value to trigger acceptance
      const rng = createMockPRNG([0.01]);
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp({
        stamina: 1000,
        wisdom: 1200, // High wisdom increases acceptance
        guts: 900,
      });

      policy.init(horse);
      // Manually set HP low to force suboptimal path
      policy.hp = 500;

      const state = createMockRaceStateForHp({
        pos: 1333,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      const maxSpeed = 20.0;
      const baseTargetSpeed2 = 18.0;

      const [_transition, speed] = policy.getLastSpurtPair(state, maxSpeed, baseTargetSpeed2);

      // With low random roll and high wisdom, should accept a better candidate
      expect(speed).toBeLessThan(maxSpeed);
    });

    test('getLastSpurtPair consumes exactly one RNG call', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const callLog: Array<number> = [];
      const rng = {
        int32: () => 0,
        random: () => 0.5,
        uniform: (upper: number) => {
          callLog.push(upper);
          return 50000;
        },
      };
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp({ stamina: 1000, guts: 900 });

      policy.init(horse);
      // Manually set HP low to enter suboptimal path
      policy.hp = 500;

      const state = createMockRaceStateForHp({
        pos: 1333,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      callLog.length = 0; // Reset log
      policy.getLastSpurtPair(state, 20.0, 18.0);

      // Should consume exactly 1 RNG call
      expect(callLog.length).toBe(1);
      expect(callLog[0]).toBe(100000);
    });

    test('isMaxSpurt returns true after achieving max spurt', () => {
      const course = createMockCourseForHp({ distance: 2000 });
      const rng = createMockPRNG();
      const policy = new GameHpPolicy(course, GroundCondition.Good, rng);
      const horse = createMockHorseForHp({ stamina: 1500 });

      policy.init(horse);
      expect(policy.isMaxSpurt()).toBe(false);

      const state = createMockRaceStateForHp({
        pos: 1333,
        phase: 2,
        posKeepStrategy: Strategy.PaceChaser,
      });

      policy.getLastSpurtPair(state, 20.0, 18.0);

      expect(policy.isMaxSpurt()).toBe(true);
    });
  });
});

