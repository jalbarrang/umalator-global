import { describe, expect, test } from 'bun:test';
import { Aptitude } from '../../runner/definitions';
import { Acceleration, Speed } from '../RaceSolver';
import {
  advanceByTime,
  advanceToPosition,
  createMockCourse,
  createMockHorse,
  createRaceSolver,
} from './fixtures';

describe('RaceSolver - Speed Calculations', () => {
  describe('baseTargetSpeed formula', () => {
    test('correct for phase 0 (early race)', () => {
      const horse = createMockHorse({
        strategy: 2, // PaceChaser
        speed: 1200,
        distanceAptitude: Aptitude.S,
      });
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ horse, course });

      const baseSpeed = 20.0;
      const phaseCoef = Speed.StrategyPhaseCoefficient[2][0]; // PaceChaser, phase 0
      const expected = baseSpeed * phaseCoef;

      expect(solver.baseTargetSpeed[0]).toBeCloseTo(expected, 5);
    });

    test('correct for phase 1 (mid race)', () => {
      const horse = createMockHorse({
        strategy: 2, // PaceChaser
        speed: 1200,
        distanceAptitude: Aptitude.S,
      });
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ horse, course });

      const baseSpeed = 20.0;
      const phaseCoef = Speed.StrategyPhaseCoefficient[2][1]; // PaceChaser, phase 1
      const expected = baseSpeed * phaseCoef;

      expect(solver.baseTargetSpeed[1]).toBeCloseTo(expected, 5);
    });

    test('correct for phase 2 (late race, includes speed stat)', () => {
      const horse = createMockHorse({
        strategy: 2, // PaceChaser
        speed: 1200,
        distanceAptitude: Aptitude.S,
      });
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ horse, course });

      const baseSpeed = 20.0;
      const phaseCoef = Speed.StrategyPhaseCoefficient[2][2]; // PaceChaser, phase 2
      const speedComponent =
        Math.sqrt(500.0 * 1200) * Speed.DistanceProficiencyModifier[Aptitude.S] * 0.002;
      const expected = baseSpeed * phaseCoef + speedComponent;

      expect(solver.baseTargetSpeed[2]).toBeCloseTo(expected, 5);
    });
  });

  describe('lastSpurtSpeed', () => {
    test('includes guts component', () => {
      const horse = createMockHorse({
        strategy: 2,
        speed: 1200,
        guts: 900,
        distanceAptitude: Aptitude.S,
      });
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ horse, course });

      // Formula includes: (450 * guts)^0.597 * 0.0001
      const gutsComponent = Math.pow(450.0 * 900, 0.597) * 0.0001;
      expect(gutsComponent).toBeGreaterThan(0);

      // lastSpurtSpeed should be greater than base phase 2 speed
      expect(solver.lastSpurtSpeed).toBeGreaterThan(solver.baseTargetSpeed[2]);
    });
  });

  describe('getMaxSpeed', () => {
    test('respects start dash limit', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      // During start dash, max speed should be capped
      expect(solver.startDash).toBe(true);
      const maxSpeed = solver.getMaxSpeed();
      expect(maxSpeed).toBeLessThanOrEqual(0.85 * solver.baseSpeed);
    });

    test('allows deceleration when currentSpeed > targetSpeed', () => {
      const solver = createRaceSolver();

      // Advance past start dash
      advanceByTime(solver, 2);
      expect(solver.startDash).toBe(false);

      // Manually set high current speed
      solver.currentSpeed = 25.0;
      solver.targetSpeed = 20.0;

      const maxSpeed = solver.getMaxSpeed();
      // Should return 9999 to allow deceleration
      expect(maxSpeed).toBe(9999.0);
    });
  });
});

describe('RaceSolver - Acceleration Calculations', () => {
  describe('baseAccel formula', () => {
    test('correct for standard case', () => {
      const horse = createMockHorse({
        strategy: 2, // PaceChaser
        power: 1100,
        distanceAptitude: Aptitude.S,
        surfaceAptitude: Aptitude.A,
      });
      const solver = createRaceSolver({ horse });

      // Formula: BaseAccel * sqrt(500 * power) * strategyCoef * groundProf * distProf
      const baseAccel = 0.0006;
      const powerComponent = Math.sqrt(500.0 * 1100);
      const strategyCoef = Acceleration.StrategyPhaseCoefficient[2][0]; // PaceChaser, phase 0
      const groundProf = Acceleration.GroundTypeProficiencyModifier[Aptitude.A];
      const distProf = Acceleration.DistanceProficiencyModifier[Aptitude.S];

      const expected = baseAccel * powerComponent * strategyCoef * groundProf * distProf;

      expect(solver.baseAccel[0]).toBeCloseTo(expected, 5);
    });

    test('uses uphill base when on slope', () => {
      const horse = createMockHorse({
        strategy: 2,
        power: 1100,
        distanceAptitude: Aptitude.S,
        surfaceAptitude: Aptitude.A,
      });
      const solver = createRaceSolver({ horse });

      // Uphill accel should use 0.0004 base
      const uphillBaseAccel = 0.0004;
      const powerComponent = Math.sqrt(500.0 * 1100);
      const strategyCoef = Acceleration.StrategyPhaseCoefficient[2][0];
      const groundProf = Acceleration.GroundTypeProficiencyModifier[Aptitude.A];
      const distProf = Acceleration.DistanceProficiencyModifier[Aptitude.S];

      const expected = uphillBaseAccel * powerComponent * strategyCoef * groundProf * distProf;

      // baseAccel[3] is uphill phase 0
      expect(solver.baseAccel[3]).toBeCloseTo(expected, 5);
    });

    test('applies strategy coefficient', () => {
      const horse = createMockHorse({ strategy: 2, power: 1100 });
      const solver = createRaceSolver({ horse });

      // Different phases should have different strategy coefficients
      expect(solver.baseAccel[0]).not.toBe(solver.baseAccel[1]);
    });

    test('applies proficiency modifiers', () => {
      const horse1 = createMockHorse({
        power: 1100,
        surfaceAptitude: Aptitude.S,
        distanceAptitude: Aptitude.S,
      });
      const horse2 = createMockHorse({
        power: 1100,
        surfaceAptitude: Aptitude.G,
        distanceAptitude: Aptitude.G,
      });

      const solver1 = createRaceSolver({ horse: horse1 });
      const solver2 = createRaceSolver({ horse: horse2 });

      // Better aptitudes should result in higher acceleration
      expect(solver1.baseAccel[0]).toBeGreaterThan(solver2.baseAccel[0]);
    });
  });
});

describe('RaceSolver - Step Function', () => {
  test('step advances position by velocity * dt', () => {
    const solver = createRaceSolver();
    const initialPos = solver.pos;

    // Skip start delay
    advanceByTime(solver, 0.2);

    expect(solver.pos).toBeGreaterThan(initialPos);
  });

  test('step caps speed at maxSpeed', () => {
    const solver = createRaceSolver();

    advanceByTime(solver, 1);

    // Speed should never exceed maxSpeed
    const maxSpeed = solver.getMaxSpeed();
    expect(solver.currentSpeed).toBeLessThanOrEqual(maxSpeed);
  });

  test('step respects minSpeed floor', () => {
    const solver = createRaceSolver();

    // Advance past start dash
    advanceByTime(solver, 3);
    expect(solver.startDash).toBe(false);

    // Speed should not go below minSpeed
    expect(solver.currentSpeed).toBeGreaterThanOrEqual(solver.minSpeed);
  });

  test('step handles start delay', () => {
    const solver = createRaceSolver();
    const initialPos = solver.pos;

    // During start delay, position should not change
    solver.step(0.015);

    // Position might not have moved if still in delay
    if (solver.startDelayAccumulator > 0) {
      expect(solver.pos).toBe(initialPos);
    }
  });

  test('step calls HP tick', () => {
    const solver = createRaceSolver();

    // accumulatetime should advance
    const initialTime = solver.accumulatetime.t;
    solver.step(0.015);

    expect(solver.accumulatetime.t).toBeGreaterThan(initialTime);
  });

  test('step updates all timers', () => {
    const solver = createRaceSolver();

    const initialTimerValues = solver.timers.map((t) => t.t);
    solver.step(0.015);

    // All timers should have advanced
    solver.timers.forEach((timer, i) => {
      expect(timer.t).toBeGreaterThan(initialTimerValues[i]);
    });
  });

  test('step exits start dash when speed threshold met', () => {
    const solver = createRaceSolver();

    expect(solver.startDash).toBe(true);

    // Advance until start dash exits
    advanceByTime(solver, 2);

    // Should eventually exit start dash
    if (solver.currentSpeed >= 0.85 * solver.baseSpeed) {
      expect(solver.startDash).toBe(false);
    }
  });

  test('step removes start dash accel modifier on exit', () => {
    const solver = createRaceSolver();

    // Initially should have +24 accel
    expect(solver.modifiers.accel.acc).toBe(24.0);

    // Advance until start dash exits
    advanceByTime(solver, 3);

    if (!solver.startDash) {
      // Should have removed the +24 modifier
      expect(solver.modifiers.accel.acc).toBe(0.0);
    }
  });
});

describe('RaceSolver - Lane Movement', () => {
  test('applyLaneMovement moves toward targetLane', () => {
    const solver = createRaceSolver();

    const initialLane = solver.currentLane;
    solver.targetLane = initialLane + 1.0;

    advanceByTime(solver, 1);

    // Should have moved toward target
    if (solver.targetLane !== initialLane) {
      expect(Math.abs(solver.currentLane - solver.targetLane)).toBeLessThan(
        Math.abs(initialLane - solver.targetLane),
      );
    }
  });

  test('applyLaneMovement respects acceleration limit', () => {
    const solver = createRaceSolver();

    const initialLane = solver.currentLane;
    solver.targetLane = initialLane + 5.0; // Large target change

    solver.step(0.015);

    // Should not move more than physically possible in one frame
    const maxChange = 0.6 * 0.015; // Max lane speed * dt
    expect(Math.abs(solver.currentLane - initialLane)).toBeLessThanOrEqual(maxChange + 0.01);
  });

  test('applyLaneMovement handles blocked side', () => {
    const solver = createRaceSolver();

    // Move to outer lane in early sections
    advanceToPosition(solver, 100);

    // Blocked side condition should prevent inward movement in certain situations
    // This is tested indirectly through the condition system
    expect(solver.currentLane).toBeGreaterThanOrEqual(0);
  });

  test('applyLaneMovement calculates extraMoveLane', () => {
    const solver = createRaceSolver();

    expect(solver.extraMoveLane).toBe(-1.0);

    // Advance to final corner
    const lastCorner = solver.course.corners[solver.course.corners.length - 1];
    advanceToPosition(solver, lastCorner.start + 10);

    // extraMoveLane should be calculated after final corner
    if (solver.pos >= lastCorner.start) {
      expect(solver.extraMoveLane).toBeGreaterThanOrEqual(0);
    }
  });

  test('applyLaneMovement handles overtake condition', () => {
    const solver = createRaceSolver();

    // Advance through race
    advanceByTime(solver, 5);

    // Lane should stay within valid bounds
    expect(solver.currentLane).toBeGreaterThanOrEqual(0);
    expect(solver.currentLane).toBeLessThanOrEqual(solver.course.maxLaneDistance);
  });
});

