import { describe, test, expect, beforeEach } from 'bun:test';
import { RaceSolver, PendingSkill, type RaceState } from '../RaceSolver';
import { CourseData, IDistanceType } from '../courses/types';
import { HorseParameters, Strategy, Aptitude } from '../HorseTypes';
import { Rule30CARng } from '../Random';
import { Region } from '../Region';
import {
  SkillType,
  SkillTarget,
  SkillPerspective,
  SkillRarity,
} from '../race-solver/types';
import { GameHpPolicy } from '../HpPolicy';
import { GroundCondition } from '../RaceParameters';

/**
 * Test suite for RaceSolver.processSkillActivations()
 *
 * This test focuses on the "Stamina Siphon" skill which:
 * - Condition: distance_type==4 & phase_random==1 & order>=5
 *   (Long distance, mid-race phase, 6th place or worse)
 * - Effect 1: Drains 100 HP from up to 5 opponents ahead (target: 9 = AheadOfSelf, modifier: -100)
 * - Effect 2: Recovers 350 HP for self (target: 1 = Self, modifier: 350)
 *
 * Key testing points:
 * - Skill activation when conditions are met
 * - Skill not activating when conditions fail
 * - Skill removal when trigger range is passed
 * - HP recovery mechanics (note: modifier is fraction of maxHp)
 * - Callback invocation for tracking
 * - Heal counter increments for both recovery effects
 */
describe('RaceSolver.processSkillActivations', () => {
  let solver: RaceSolver;
  let course: CourseData;
  let horse: HorseParameters;
  let rng: InstanceType<typeof Rule30CARng>;

  beforeEach(() => {
    // Create a long distance course (3000m) to match distance_type==4
    course = {
      raceTrackId: 10101,
      distance: 3000,
      surface: 1, // Turf
      turn: 1, // Right
      distanceType: 4 as IDistanceType, // Long
      courseSetStatus: [],
      corners: [],
      straights: [],
      slopes: [],
      laneMax: 1.5,
      courseWidth: 11.25,
      horseLane: 0.625,
      laneChangeAcceleration: 0.0006,
      laneChangeAccelerationPerFrame: 0.00004,
      maxLaneDistance: 16.875,
      moveLanePoint: 0,
    };

    // Create a horse with moderate stats
    horse = {
      speed: 1200,
      stamina: 1200,
      power: 800,
      guts: 400,
      wisdom: 400,
      rawStamina: 1200,
      strategy: Strategy.Sasi, // Late surger (Sashi)
      distanceAptitude: Aptitude.A,
      surfaceAptitude: Aptitude.A,
      strategyAptitude: Aptitude.A,
    };

    // Create RNG with fixed seed for reproducibility
    rng = new Rule30CARng(123456);

    // Create HP policy with Good ground condition
    const hpPolicy = new GameHpPolicy(course, GroundCondition.Good, rng);
    hpPolicy.init(horse);

    // Create the Stamina Siphon skill
    // Condition: distance_type==4 & phase_random==1 & order>=5
    // For testing, we'll use a simple condition that always returns true
    // In a real scenario, this would be parsed from the condition string
    const staminaSiphonSkill: PendingSkill = {
      skillId: 'stamina_siphon_test',
      perspective: SkillPerspective.Self,
      rarity: SkillRarity.Gold,
      trigger: new Region(1500, 2000), // Trigger in mid-race (section ~12-16)
      extraCondition: (state: RaceState) => {
        // Check if in mid-race phase (phase 1) and order >= 5 (6th place or worse)
        // For this test, we'll simulate being in 6th place
        return state.phase === 1; // Mid-race phase
      },
      effects: [
        // Effect 1: Drain 100 HP from 5 opponents ahead
        {
          type: SkillType.Recovery,
          baseDuration: 0,
          modifier: -100,
          target: SkillTarget.AheadOfSelf,
        },
        // Effect 2: Recover 350 HP for self
        {
          type: SkillType.Recovery,
          baseDuration: 0,
          modifier: 350,
          target: SkillTarget.Self,
        },
      ],
    };

    // Initialize the RaceSolver with the skill
    solver = new RaceSolver({
      horse,
      course,
      rng,
      skills: [staminaSiphonSkill],
      hp: hpPolicy,
      skillCheckChance: false, // Disable wisdom check for testing
    });

    // Manually set the solver to mid-race conditions
    // Position at 1600m (within trigger range 1500-2000m)
    solver.pos = 1600;
    solver.phase = 1; // Mid-race
    solver.accumulatetime.t = 80; // Simulate 80 seconds elapsed
  });

  test('should activate Stamina Siphon skill when conditions are met', () => {
    // Verify skill is in pending skills
    expect(solver.pendingSkills.length).toBe(1);
    expect(solver.pendingSkills[0]?.skillId).toBe('stamina_siphon_test');

    // Consume some HP to test recovery
    // GameHpPolicy stores HP as a number, we can simulate consumption
    const maxHp = (solver.hp as GameHpPolicy).maxHp;
    if (solver.hp instanceof GameHpPolicy) {
      solver.hp.hp = maxHp - 1000; // Reduce HP by 1000 to have room for recovery
    }
    const hpBeforeSkill = solver.hp.hp;

    // Process skill activations
    solver.processSkillActivations();

    // Verify the skill was activated and removed from pending
    expect(solver.pendingSkills.length).toBe(0);

    // Verify HP recovery occurred
    // Note: The recover() method calculates: hp + maxHp * modifier
    // With modifier = 350, recovery = maxHp * 350
    // This will be capped at maxHp due to Math.min in recover()
    // So we just verify that HP increased toward maxHp
    const finalHp = solver.hp.hp;
    expect(finalHp).toBeGreaterThan(hpBeforeSkill);
    // Since maxHp * 350 >> maxHp, HP should be restored to maxHp
    expect(finalHp).toBe(maxHp);
  });

  test('should remove skill when position is past trigger range', () => {
    // Move position past trigger range
    solver.pos = 2100; // Past 1500-2000m range (trigger.end = 2000)

    // Record initial HP
    const initialHp = solver.hp.hp;

    // Process skill activations
    solver.processSkillActivations();

    // Verify skill was removed (failed to activate within trigger range)
    // Per RaceSolver logic: if pos >= trigger.end, skill is removed
    expect(solver.pendingSkills.length).toBe(0);

    // Verify HP did not change
    expect(solver.hp.hp).toBe(initialHp);
  });

  test('should not activate skill when phase condition is not met', () => {
    // Change to wrong phase
    solver.phase = 0; // Early-race instead of mid-race

    // Record initial HP
    const initialHp = solver.hp.hp;

    // Process skill activations
    solver.processSkillActivations();

    // Verify skill is still pending
    expect(solver.pendingSkills.length).toBe(1);

    // Verify HP did not change
    expect(solver.hp.hp).toBe(initialHp);
  });

  test('should remove skill from pending when trigger range is passed', () => {
    // Move position past trigger range
    solver.pos = 2001; // Just past the end of trigger

    // Process skill activations
    solver.processSkillActivations();

    // Verify skill was removed from pending (failed to activate)
    expect(solver.pendingSkills.length).toBe(0);
  });

  test('should track heal activation count', () => {
    // Record initial heal count
    const initialHealCount = solver.activateCountHeal;

    // Process skill activations (should activate and heal)
    solver.processSkillActivations();

    // Verify heal count increased by 2 (one for each recovery effect in the skill)
    // The Stamina Siphon skill has 2 recovery effects:
    // 1. Drain HP from opponents (-100)
    // 2. Recover HP for self (+350)
    expect(solver.activateCountHeal).toBe(initialHealCount + 2);
  });

  test('should call onSkillActivate callback when skill activates', () => {
    let activationCalled = false;
    let activatedSkillId: string = '';
    let activatedType: number = 0;

    // Set up callback to track activation
    solver.onSkillActivate = (
      _solver: RaceSolver,
      _executionId: string,
      skillId: string,
      _perspective: number,
      type: number,
      _target: number,
    ) => {
      activationCalled = true;
      activatedSkillId = skillId;
      activatedType = type;
    };

    // Process skill activations
    solver.processSkillActivations();

    // Verify callback was called with correct parameters
    expect(activationCalled).toBe(true);
    expect(activatedSkillId).toBe('stamina_siphon_test');
    expect(activatedType).toBe(SkillType.Recovery);
  });

  test('should mark skill as used after activation', () => {
    // Verify skill is not yet marked as used
    expect(solver.usedSkills.has('stamina_siphon_test')).toBe(false);

    // Process skill activations
    solver.processSkillActivations();

    // Verify skill is marked as used
    expect(solver.usedSkills.has('stamina_siphon_test')).toBe(true);
  });
});
