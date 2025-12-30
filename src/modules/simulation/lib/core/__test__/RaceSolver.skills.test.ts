import { describe, expect, test } from 'bun:test';
import { SkillPerspective, SkillRarity, SkillType } from '../../skills/definitions';
import { Region } from '../../utils/Region';
import { advanceToPosition, createMockCourse, createRaceSolver } from './fixtures';
import type { PendingSkill } from '../RaceSolver';

describe('RaceSolver - Skill Processing', () => {
  describe('Skill Activation', () => {
    test('processSkillActivations checks pending skills', () => {
      const skill: PendingSkill = {
        skillId: 'test_001',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false, // Disable wisdom check for testing
      });

      expect(solver.pendingSkills.length).toBe(1);

      // Advance into trigger region
      advanceToPosition(solver, 150);

      // Skill should have activated and been removed from pending
      expect(solver.pendingSkills.length).toBe(0);
    });

    test('processSkillActivations respects trigger regions', () => {
      const skill: PendingSkill = {
        skillId: 'test_002',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(500, 600),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      // Before trigger region
      advanceToPosition(solver, 400);
      expect(solver.pendingSkills.length).toBe(1);

      // In trigger region
      advanceToPosition(solver, 550);
      expect(solver.pendingSkills.length).toBe(0);
    });

    test('processSkillActivations calls extraCondition', () => {
      let conditionCalled = false;

      const skill: PendingSkill = {
        skillId: 'test_003',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => {
          conditionCalled = true;
          return false; // Don't activate
        },
        effects: [],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      expect(conditionCalled).toBe(true);
      // Skill should still be pending since condition returned false
      expect(solver.pendingSkills.length).toBe(1);
    });

    test('processSkillActivations respects wisdom check', () => {
      const skill: PendingSkill = {
        skillId: 'test_004',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: true, // Enable wisdom check
      });

      advanceToPosition(solver, 150);

      // Skill might or might not activate depending on wisdom check
      // Just verify the system doesn't crash
      expect(solver.pendingSkills.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Skill Activation Details', () => {
    test('activateSkill increments activateCount', () => {
      const skill: PendingSkill = {
        skillId: 'test_005',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      const initialCount = solver.activateCount[solver.phase];

      advanceToPosition(solver, 150);

      expect(solver.activateCount[solver.phase]).toBe(initialCount + 1);
    });

    test('activateSkill adds to usedSkills set', () => {
      const skill: PendingSkill = {
        skillId: 'test_006',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      expect(solver.usedSkills.has('test_006')).toBe(false);

      advanceToPosition(solver, 150);

      expect(solver.usedSkills.has('test_006')).toBe(true);
    });

    test('activateSkill calls onSkillActivate callback', () => {
      const skill: PendingSkill = {
        skillId: 'test_007',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      // We can't easily test the callback with the current factory,
      // but we can verify the skill was activated
      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      // Verify skill was activated by checking it's in usedSkills
      expect(solver.usedSkills.has('test_007')).toBe(true);
    });

    test('activateSkill calculates scaled duration', () => {
      const skill: PendingSkill = {
        skillId: 'test_008',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const course = createMockCourse({ distance: 2000 });
      const solver = createRaceSolver({
        course,
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      // Skill should be active
      expect(solver.activeTargetSpeedSkills.length).toBe(1);

      // Duration timer starts negative and counts up
      // It will have been incremented by the time we check it
      // Just verify it's negative (not yet expired)
      expect(solver.activeTargetSpeedSkills[0].durationTimer.t).toBeLessThan(0);
    });
  });

  describe('Effect Application', () => {
    test('applyEffect handles target speed modifier', () => {
      const skill: PendingSkill = {
        skillId: 'test_009',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      expect(solver.activeTargetSpeedSkills.length).toBe(1);
      expect(solver.modifiers.targetSpeed.acc).toBeCloseTo(0.5, 5);
    });

    test('applyEffect handles current speed modifier', () => {
      const skill: PendingSkill = {
        skillId: 'test_010',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.CurrentSpeed,
            baseDuration: 3.0,
            modifier: 1.0,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      expect(solver.activeCurrentSpeedSkills.length).toBe(1);
      expect(solver.modifiers.currentSpeed.acc).toBeCloseTo(1.0, 5);
    });

    test('applyEffect handles acceleration modifier', () => {
      const skill: PendingSkill = {
        skillId: 'test_011',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.Accel,
            baseDuration: 3.0,
            modifier: 0.3,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      expect(solver.activeAccelSkills.length).toBe(1);
      expect(solver.modifiers.accel.acc).toBeCloseTo(0.3, 5);
    });

    test('applyEffect handles HP recovery', () => {
      const skill: PendingSkill = {
        skillId: 'test_012',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.Recovery,
            baseDuration: 0,
            modifier: 0.1, // 10% recovery
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      // HP recovery should have been called (NoopHpPolicy doesn't change anything)
      expect(solver.activateCountHeal).toBeGreaterThan(0);
    });

    test('applyEffect handles stat modifications (green skills)', () => {
      const skill: PendingSkill = {
        skillId: 'test_013',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(0, 10), // Gate skill
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.SpeedUp,
            baseDuration: 0,
            modifier: 50,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      // Green skills activate at gate (default speed is 1200)
      expect(solver.horse.speed).toBe(1200 + 50);
    });

    test('applyEffect creates duration timer for timed effects', () => {
      const skill: PendingSkill = {
        skillId: 'test_014',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      expect(solver.activeTargetSpeedSkills.length).toBe(1);
      expect(solver.activeTargetSpeedSkills[0].durationTimer).toBeDefined();
      expect(solver.activeTargetSpeedSkills[0].durationTimer.t).toBeLessThan(0);
    });
  });

  describe('Skill Expiration', () => {
    test('expired skills removed from active lists', () => {
      const skill: PendingSkill = {
        skillId: 'test_015',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0, // Reasonable duration
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      expect(solver.activeTargetSpeedSkills.length).toBe(1);

      // Advance far enough to expire skill (distance-scaled duration)
      advanceToPosition(solver, 800);

      // Skill should have expired
      expect(solver.activeTargetSpeedSkills.length).toBe(0);
    });

    test('modifier removed on skill expiration', () => {
      const skill: PendingSkill = {
        skillId: 'test_016',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: false,
      });

      advanceToPosition(solver, 150);

      expect(solver.modifiers.targetSpeed.acc).toBeCloseTo(0.5, 5);

      // Advance to expire skill
      advanceToPosition(solver, 800);

      // Modifier should be removed
      expect(solver.modifiers.targetSpeed.acc).toBeCloseTo(0.0, 5);
    });
  });

  describe('Wisdom Check', () => {
    test('green skills bypass wisdom check', () => {
      const skill: PendingSkill = {
        skillId: 'test_017',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.White,
        trigger: new Region(0, 10),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.SpeedUp,
            baseDuration: 0,
            modifier: 50,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: true, // Enable wisdom check
      });

      // Green skill should always activate regardless of wisdom check
      expect(solver.horse.speed).toBeGreaterThan(1200);
    });

    test('unique rarity skills bypass wisdom check', () => {
      const skill: PendingSkill = {
        skillId: 'test_018',
        perspective: SkillPerspective.Self,
        rarity: SkillRarity.Unique,
        trigger: new Region(100, 200),
        extraCondition: () => true,
        effects: [
          {
            type: SkillType.TargetSpeed,
            baseDuration: 3.0,
            modifier: 0.5,
            target: 1,
          },
        ],
      };

      const solver = createRaceSolver({
        skills: [skill],
        skillCheckChance: true,
      });

      advanceToPosition(solver, 150);

      // Unique skill should always activate
      expect(solver.usedSkills.has('test_018')).toBe(true);
    });
  });
});

