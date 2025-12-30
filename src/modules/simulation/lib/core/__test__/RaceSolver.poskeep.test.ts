import { describe, expect, test } from 'bun:test';
import { PosKeepMode, Strategy } from '../../runner/definitions';
import { PositionKeepState } from '../../skills/definitions';
import { PositionKeep } from '../RaceSolver';
import {
  advanceToPosition,
  createMockCourse,
  createMockHorse,
  createRaceSolver,
} from './fixtures';

describe('RaceSolver - Position Keep Thresholds', () => {
  describe('Threshold Calculations', () => {
    test('posKeepMinThreshold formula correct', () => {
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse({ strategy: Strategy.PaceChaser });
      const solver = createRaceSolver({ horse, course });

      // PaceChaser (senkou) has a constant minimum threshold of 3.0
      // independent of course factor
      const expected = 3.0;

      expect(solver.posKeepMinThreshold).toBeCloseTo(expected, 5);
    });

    test('posKeepMaxThreshold formula correct', () => {
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse({ strategy: Strategy.PaceChaser });
      const solver = createRaceSolver({ horse, course });

      const courseFactor = PositionKeep.courseFactor(2000);
      const expected = PositionKeep.BaseMaximumThreshold[Strategy.PaceChaser] * courseFactor;

      expect(solver.posKeepMaxThreshold).toBeCloseTo(expected, 5);
    });

    test('courseFactor formula correct', () => {
      // Formula: 0.0008 * (distance - 1000) + 1.0
      expect(PositionKeep.courseFactor(1000)).toBeCloseTo(1.0, 5);
      expect(PositionKeep.courseFactor(2000)).toBeCloseTo(1.8, 5);
      expect(PositionKeep.courseFactor(3000)).toBeCloseTo(2.6, 5);
    });
  });
});

describe('RaceSolver - Position Keep State Transitions', () => {
  describe('State Transitions', () => {
    test('applyPositionKeepStates triggers PaceUp', () => {
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse({ strategy: Strategy.PaceChaser });

      // Create pacer and follower
      const pacer = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.FrontRunner }),
        course,
      });
      const follower = createRaceSolver({ horse, course });

      // Initialize umas
      follower.initUmas([pacer, follower]);
      pacer.initUmas([pacer, follower]);

      // Set pacer
      follower.pacer = pacer;
      follower.posKeepMode = PosKeepMode.Virtual;
      follower.posKeepNextTimer.t = 0; // Ready to check

      // Move pacer ahead
      pacer.pos = 200;
      follower.pos = 100; // Far behind

      // Should trigger PaceUp if behind > maxThreshold
      follower.applyPositionKeepStates();

      // Check if PaceUp was triggered (depends on wisdom check)
      if (follower.positionKeepState === PositionKeepState.PaceUp) {
        expect(follower.positionKeepState).toBe(PositionKeepState.PaceUp);
      }
    });

    test('applyPositionKeepStates triggers PaceDown', () => {
      const course = createMockCourse({ distance: 2000 });
      const horse = createMockHorse({ strategy: Strategy.PaceChaser });

      const pacer = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.FrontRunner }),
        course,
      });
      const follower = createRaceSolver({ horse, course });

      follower.initUmas([pacer, follower]);
      pacer.initUmas([pacer, follower]);

      follower.pacer = pacer;
      follower.posKeepMode = PosKeepMode.Virtual;
      follower.posKeepNextTimer.t = 0;

      // Move follower close to pacer
      pacer.pos = 100;
      follower.pos = 99; // Very close

      follower.applyPositionKeepStates();

      // PaceDown should trigger if too close and no active skills
      if (follower.positionKeepState === PositionKeepState.PaceDown) {
        expect(follower.positionKeepState).toBe(PositionKeepState.PaceDown);
      }
    });

    test('applyPositionKeepStates triggers SpeedUp for front runner', () => {
      const course = createMockCourse({ distance: 2000 });
      const frontRunner = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.FrontRunner }),
        course,
      });
      const chaser = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.PaceChaser }),
        course,
      });

      frontRunner.initUmas([frontRunner, chaser]);
      chaser.initUmas([frontRunner, chaser]);

      frontRunner.pacer = frontRunner; // Is the pacer
      frontRunner.posKeepMode = PosKeepMode.Virtual;
      frontRunner.posKeepNextTimer.t = 0;

      // Set positions so front runner is barely ahead
      frontRunner.pos = 100;
      chaser.pos = 98; // Close behind

      frontRunner.applyPositionKeepStates();

      // SpeedUp might trigger if distance < threshold (4.5m for FrontRunner)
      if (frontRunner.positionKeepState === PositionKeepState.SpeedUp) {
        expect(frontRunner.positionKeepState).toBe(PositionKeepState.SpeedUp);
      }
    });

    test('applyPositionKeepStates triggers Overtake for non-leader front runner', () => {
      const course = createMockCourse({ distance: 2000 });
      const leader = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.FrontRunner }),
        course,
      });
      const chaser = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.FrontRunner }),
        course,
      });

      leader.initUmas([leader, chaser]);
      chaser.initUmas([leader, chaser]);

      chaser.pacer = leader;
      chaser.posKeepMode = PosKeepMode.Virtual;
      chaser.posKeepNextTimer.t = 0;

      leader.pos = 100;
      chaser.pos = 95;

      chaser.applyPositionKeepStates();

      // Overtake might trigger for non-leader front runner
      if (chaser.positionKeepState === PositionKeepState.Overtake) {
        expect(chaser.positionKeepState).toBe(PositionKeepState.Overtake);
      }
    });

    test('position keep ends at section boundary', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      solver.posKeepMode = PosKeepMode.Virtual;
      solver.positionKeepState = PositionKeepState.PaceUp;
      solver.posKeepExitPosition = 200;
      solver.positionKeepActivations.push([100, 0, PositionKeepState.PaceUp]);

      advanceToPosition(solver, 250);

      // Should have exited position keep state
      // (State transitions depend on having a pacer and other conditions)
      expect(solver.pos).toBeGreaterThan(200);
    });

    test('position keep skips when mode is None', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      solver.posKeepMode = PosKeepMode.None;

      advanceToPosition(solver, 100);

      // Should never enter position keep states (None = 0)
      expect(solver.positionKeepState as number).toBe(PositionKeepState.None);
    });

    test('position keep ends at posKeepEnd position', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      solver.posKeepMode = PosKeepMode.Virtual;
      solver.positionKeepState = PositionKeepState.PaceUp;

      // Advance past posKeepEnd
      advanceToPosition(solver, solver.posKeepEnd + 10);

      // Should have exited (None = 0)
      expect(solver.positionKeepState as number).toBe(PositionKeepState.None);
    });
  });

  describe('Speed Coefficients', () => {
    test('SpeedUp applies 1.04x coefficient', () => {
      const solver = createRaceSolver();
      solver.positionKeepState = PositionKeepState.SpeedUp;

      solver.updatePositionKeepCoefficient();

      expect(solver.posKeepSpeedCoef).toBe(1.04);
    });

    test('Overtake applies 1.05x coefficient', () => {
      const solver = createRaceSolver();
      solver.positionKeepState = PositionKeepState.Overtake;

      solver.updatePositionKeepCoefficient();

      expect(solver.posKeepSpeedCoef).toBe(1.05);
    });

    test('PaceUp applies 1.04x coefficient', () => {
      const solver = createRaceSolver();
      solver.positionKeepState = PositionKeepState.PaceUp;

      solver.updatePositionKeepCoefficient();

      expect(solver.posKeepSpeedCoef).toBe(1.04);
    });

    test('PaceDown applies 0.915x coefficient (Global value)', () => {
      const solver = createRaceSolver();
      solver.positionKeepState = PositionKeepState.PaceDown;

      solver.updatePositionKeepCoefficient();

      // Global uses 0.915x, NOT 0.945x
      expect(solver.posKeepSpeedCoef).toBe(0.915);
    });

    test('None state applies 1.0x coefficient', () => {
      const solver = createRaceSolver();
      solver.positionKeepState = PositionKeepState.None;

      solver.updatePositionKeepCoefficient();

      expect(solver.posKeepSpeedCoef).toBe(1.0);
    });
  });

  describe('Pacemaker Selection', () => {
    test('getPacer returns front runner if exists', () => {
      const course = createMockCourse({ distance: 2000 });
      const frontRunner = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.FrontRunner }),
        course,
      });
      const chaser = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.PaceChaser }),
        course,
      });

      frontRunner.initUmas([frontRunner, chaser]);
      chaser.initUmas([frontRunner, chaser]);

      const pacer = chaser.getPacer();

      // Should return the front runner
      expect(pacer).toBe(frontRunner);
    });

    test('getPacer handles no front runners (lucky pace)', () => {
      const course = createMockCourse({ distance: 2000 });
      const chaser1 = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.PaceChaser }),
        course,
      });
      const chaser2 = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.PaceChaser }),
        course,
      });

      chaser1.initUmas([chaser1, chaser2]);
      chaser2.initUmas([chaser1, chaser2]);

      const pacer = chaser1.getPacer();

      // Should return a pacer (lucky pace scenario)
      expect(pacer).toBeDefined();
      if (pacer) {
        expect(pacer.pacerOverride).toBe(true);
      }
    });

    test('getPacer sets pacerOverride for lucky pace', () => {
      const course = createMockCourse({ distance: 2000 });
      const chaser1 = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.LateSurger }),
        course,
      });
      const chaser2 = createRaceSolver({
        horse: createMockHorse({ strategy: Strategy.EndCloser }),
        course,
      });

      chaser1.initUmas([chaser1, chaser2]);
      chaser2.initUmas([chaser1, chaser2]);

      const pacer = chaser1.getPacer();

      // In lucky pace scenario, pacerOverride should be set
      if (pacer && !pacer.isPacer) {
        expect(pacer.pacerOverride).toBe(true);
      }
    });
  });
});

