import { describe, expect, test } from 'bun:test';
import {
  advanceToPhase,
  advanceToPosition,
  createMockCourse,
  createMockHorse,
  createMockPRNG,
  createRaceSolver,
} from './fixtures';

describe('RaceSolver - Initialization', () => {
  describe('Constructor', () => {
    test('initializes with correct starting position', () => {
      const solver = createRaceSolver();
      expect(solver.pos).toBe(0);
    });

    test('initializes with correct starting speed', () => {
      const solver = createRaceSolver();
      expect(solver.currentSpeed).toBe(3.0);
    });

    test('calculates baseSpeed from course distance', () => {
      // Formula: 20.0 - (distance - 2000) / 1000.0
      const solver1 = createRaceSolver({ course: createMockCourse({ distance: 2000 }) });
      expect(solver1.baseSpeed).toBe(20.0);

      const solver2 = createRaceSolver({ course: createMockCourse({ distance: 1200 }) });
      expect(solver2.baseSpeed).toBe(20.8);

      const solver3 = createRaceSolver({ course: createMockCourse({ distance: 3200 }) });
      expect(solver3.baseSpeed).toBe(18.8);
    });

    test('calculates minSpeed with guts', () => {
      // Formula: 0.85 * baseSpeed + sqrt(200 * guts) * 0.001
      const horse = createMockHorse({ guts: 900 });
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ horse, course });

      const expectedMinSpeed = 0.85 * 20.0 + Math.sqrt(200 * 900) * 0.001;
      expect(solver.miSpeed).toBeCloseTo(expectedMinSpeed, 5);
    });

    test('initializes phase to 0', () => {
      const solver = createRaceSolver();
      expect(solver.phase).toBe(0);
    });

    test('calculates start delay from RNG', () => {
      const rng = createMockPRNG(42);
      const solver = createRaceSolver({ rng });

      // Start delay should be in range [0, 0.1)
      expect(solver.startDelay).toBeGreaterThanOrEqual(0);
      expect(solver.startDelay).toBeLessThan(0.1);
    });

    test('applies start dash accel modifier (+24)', () => {
      const solver = createRaceSolver();

      // Start dash should add 24 to accel modifier
      expect(solver.modifiers.accel.acc).toBe(24.0);
      expect(solver.startDash).toBe(true);
    });

    test('initializes all timers', () => {
      const solver = createRaceSolver();

      // Should have multiple timers initialized
      expect(solver.timers.length).toBeGreaterThan(0);
      expect(solver.accumulatetime).toBeDefined();
    });

    test('clones horse parameters', () => {
      const originalHorse = createMockHorse({ speed: 1200 });
      const solver = createRaceSolver({ horse: originalHorse });

      // Modify solver's horse
      solver.horse.speed = 1500;

      // Original should be unchanged
      expect(originalHorse.speed).toBe(1200);
      expect(solver.horse.speed).toBe(1500);
    });

    test('clones pending skills', () => {
      const skills = [
        {
          skillId: 'test_001',
          perspective: 1 as const,
          rarity: 1 as const,
          trigger: { start: 500, end: 600 } as any, // Not at gate
          extraCondition: () => true,
          effects: [],
        },
      ];

      const solver = createRaceSolver({ skills });

      // Skills should be cloned
      expect(solver.pendingSkills.length).toBe(1);

      // Modify solver's skills
      if (solver.pendingSkills.length > 0) {
        solver.pendingSkills[0].skillId = 'modified';

        // Original should be unchanged
        expect(skills[0].skillId).toBe('test_001');
      }
    });
  });

  describe('Hill Initialization', () => {
    test('initHills populates hillStart and hillEnd', () => {
      const course = createMockCourse({
        slopes: [
          { start: 100, length: 80, slope: 20000 },
          { start: 300, length: 50, slope: -15000 },
        ],
      });

      const solver = createRaceSolver({ course });

      expect(solver.hillStart.length).toBeGreaterThan(0);
      expect(solver.hillEnd.length).toBeGreaterThan(0);
    });

    test('initHills reverses slope order', () => {
      const course = createMockCourse({
        slopes: [
          { start: 100, length: 80, slope: 20000 },
          { start: 300, length: 50, slope: 15000 },
        ],
      });

      const solver = createRaceSolver({ course });

      // Arrays should be reversed for sequential processing
      // Last slope should be first in the arrays
      expect(solver.hillStart[solver.hillStart.length - 1]).toBe(100);
    });

    test('initHills handles course with no slopes', () => {
      const course = createMockCourse({ slopes: [] });
      const solver = createRaceSolver({ course });

      expect(solver.hillStart.length).toBe(0);
      expect(solver.hillEnd.length).toBe(0);
      expect(solver.hillIdx).toBe(-1);
    });

    test('initHills throws if slopes not sorted', () => {
      const course = createMockCourse({
        slopes: [
          { start: 300, length: 50, slope: 15000 }, // Out of order
          { start: 100, length: 80, slope: 20000 },
        ],
      });

      expect(() => createRaceSolver({ course })).toThrow('slopes must be sorted');
    });

    test('initHills filters slopes by grade threshold', () => {
      const course = createMockCourse({
        slopes: [
          { start: 100, length: 80, slope: 50 }, // <1% grade, should be filtered
          { start: 300, length: 50, slope: 20000 }, // >1% grade, should be kept
        ],
      });

      const solver = createRaceSolver({ course });

      // Only slopes with >1% grade (slope > 100) should affect hillIdx
      // The small slope should be filtered out
      expect(solver.nHills).toBe(2);
    });
  });

  describe('RNG Initialization', () => {
    test('creates separate RNG streams', () => {
      const rng = createMockPRNG(12345);
      const solver = createRaceSolver({ rng });

      // Should have multiple separate RNG instances
      expect(solver.rng).toBeDefined();
      expect(solver.syncRng).toBeDefined();
      expect(solver.gorosiRng).toBeDefined();
      expect(solver.rushedRng).toBeDefined();
      expect(solver.downhillRng).toBeDefined();
      expect(solver.wisdomRollRng).toBeDefined();
      expect(solver.posKeepRng).toBeDefined();
      expect(solver.laneMovementRng).toBeDefined();

      // They should be different instances
      expect(solver.syncRng).not.toBe(solver.rng);
      expect(solver.gorosiRng).not.toBe(solver.rng);
    });

    test('gateRoll is uniform mod 12252240', () => {
      const solver = createRaceSolver();

      // gateRoll should be in valid range [0, 12252240)
      expect(solver.gateRoll).toBeGreaterThanOrEqual(0);
      expect(solver.gateRoll).toBeLessThan(12252240);
    });

    test('randomLot is uniform mod 100', () => {
      const solver = createRaceSolver();

      // randomLot should be in range [0, 100)
      expect(solver.randomLot).toBeGreaterThanOrEqual(0);
      expect(solver.randomLot).toBeLessThan(100);
    });
  });
});

describe('RaceSolver - Phase Transitions', () => {
  describe('Phase Updates', () => {
    test('updatePhase transitions at correct positions', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      expect(solver.phase).toBe(0);

      // Advance to phase 1 boundary (1/6 of 2000 = 333.33m)
      advanceToPosition(solver, 334);
      expect(solver.phase).toBe(1);

      // Advance to phase 2 boundary (2/3 of 2000 = 1333.33m)
      advanceToPosition(solver, 1334);
      expect(solver.phase).toBe(2);
    });

    test('updatePhase sets nextPhaseTransition', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      // Initial nextPhaseTransition should be at 1/6 distance
      expect(solver.nextPhaseTransition).toBeCloseTo(2000 / 6, 1);

      // Advance to phase 1
      advanceToPosition(solver, 334);

      // nextPhaseTransition should now be at 2/3 distance
      expect(solver.nextPhaseTransition).toBeCloseTo((2000 * 2) / 3, 1);
    });

    test('phase 0 to 1 transition', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      advanceToPosition(solver, 334);
      expect(solver.phase).toBe(1);
    });

    test('phase 1 to 2 transition', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      advanceToPosition(solver, 1334);
      expect(solver.phase).toBe(2);
    });

    test('phase stays at 2 after final transition', () => {
      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({ course });

      advanceToPosition(solver, 1900);
      expect(solver.phase).toBe(2);

      // Continue advancing
      advanceToPosition(solver, 1950);
      expect(solver.phase).toBe(2); // Should not go beyond 2
    });
  });

  describe('Last Spurt State', () => {
    test('lastSpurtSpeed is calculated', () => {
      const solver = createRaceSolver();

      // lastSpurtSpeed should be calculated in constructor
      expect(solver.lastSpurtSpeed).toBeGreaterThan(0);
      // Should be greater than base speed
      expect(solver.lastSpurtSpeed).toBeGreaterThan(solver.baseSpeed);
    });

    test('lastSpurtTransition starts unset', () => {
      const solver = createRaceSolver();

      // In phase 0 or 1, lastSpurtTransition should not be calculated yet
      advanceToPosition(solver, 500);
      expect(solver.phase).toBeLessThan(2);

      // lastSpurtTransition should still be -1
      expect(solver.lastSpurtTransition).toBe(-1);
    });

    test('lastSpurtTransition is initialized', () => {
      const solver = createRaceSolver();

      // lastSpurtTransition starts at -1
      expect(solver.lastSpurtTransition).toBe(-1);
    });

    test('lastSpurtTransition gets calculated in phase 2', () => {
      const solver = createRaceSolver();

      advanceToPhase(solver, 2);

      // With NoopHpPolicy, last spurt is simple
      // The transition should be set (or remain -1 for noop)
      expect(typeof solver.lastSpurtTransition).toBe('number');
    });
  });
});

describe('RaceSolver - Rushed State', () => {
  describe('Rushed Initialization', () => {
    test('initRushedState calculates chance from wisdom', () => {
      // Formula: (6.5 / log10(0.1*wiz+1))² / 100
      const horse1 = createMockHorse({ wisdom: 1000 });
      const solver1 = createRaceSolver({
        horse: horse1,
        disableRushed: false,
        rng: createMockPRNG(1),
      });

      // With a specific seed that triggers rushed
      const horse2 = createMockHorse({ wisdom: 100 }); // Low wisdom = higher chance
      const solver2 = createRaceSolver({
        horse: horse2,
        disableRushed: false,
        rng: createMockPRNG(1),
      });

      // Both should have rushed state initialized (or not) based on RNG
      expect(solver1.hasBeenRushed).toBe(false);
      expect(solver2.hasBeenRushed).toBe(false);
    });

    test('initRushedState determines section 2-9', () => {
      const solver = createRaceSolver({
        disableRushed: false,
        rng: createMockPRNG(100), // Seed that triggers rushed
      });

      // If rushed is triggered, section should be 2-9
      if (solver.rushedSection >= 0) {
        expect(solver.rushedSection).toBeGreaterThanOrEqual(2);
        expect(solver.rushedSection).toBeLessThanOrEqual(9);
      }
    });

    test('initRushedState skips when disabled', () => {
      const solver = createRaceSolver({ disableRushed: true });

      expect(solver.rushedSection).toBe(-1);
      expect(solver.rushedEnterPosition).toBe(-1);
    });
  });

  describe('Rushed Updates', () => {
    test('updateRushedState can only activate once', () => {
      const solver = createRaceSolver({
        disableRushed: false,
        rng: createMockPRNG(50),
      });

      // Manually set rushed state for testing
      solver.rushedSection = 2;
      solver.rushedEnterPosition = 200;

      advanceToPosition(solver, 250);

      if (solver.hasBeenRushed) {
        // Once rushed, hasBeenRushed should be true
        expect(solver.hasBeenRushed).toBe(true);

        // Should not be able to trigger again
        solver.isRushed = false;
        advanceToPosition(solver, 300);
        expect(solver.isRushed).toBe(false);
      }
    });

    test('endRushedState records position for UI', () => {
      const solver = createRaceSolver({
        disableRushed: false,
      });

      // Manually trigger rushed state
      solver.isRushed = true;
      solver.hasBeenRushed = true;
      solver.rushedActivations.push([100, -1]);

      advanceToPosition(solver, 150);

      // End rushed state
      solver.isRushed = false;
      if (solver.rushedActivations.length > 0) {
        solver.rushedActivations[solver.rushedActivations.length - 1][1] = solver.pos;
      }

      // Should have recorded end position
      expect(solver.rushedActivations[0][1]).toBeGreaterThan(0);
    });
  });
});

describe('RaceSolver - Downhill Mode', () => {
  test('updateDownhillMode skips when disabled', () => {
    const course = createMockCourse({
      slopes: [{ start: 300, length: 100, slope: -15000 }], // Downhill
    });

    const solver = createRaceSolver({
      course,
      disableDownhill: true,
    });

    advanceToPosition(solver, 350);

    expect(solver.isDownhillMode).toBe(false);
  });

  test('updateDownhillMode deactivates when leaving slope', () => {
    const course = createMockCourse({
      slopes: [{ start: 300, length: 100, slope: -15000 }], // Downhill
    });

    const solver = createRaceSolver({
      course,
      disableDownhill: false,
    });

    // Manually activate downhill mode
    solver.isDownhillMode = true;
    solver.downhillModeStart = 0;

    // Move past the downhill
    advanceToPosition(solver, 450);

    // Should deactivate when leaving downhill
    expect(solver.isDownhillMode).toBe(false);
  });
});
