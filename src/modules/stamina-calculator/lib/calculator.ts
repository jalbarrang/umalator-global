/**
 * Pure calculation engine for stamina calculator
 * Used by both the worker and potentially for server-side calculations
 */

import { CourseHelpers } from '@simulation/lib/CourseData';
import {
  HpConsumptionGroundModifier,
  HpStrategyCoefficient,
} from '@simulation/lib/HpPolicy';
import { Acceleration, Speed } from '@simulation/lib/RaceSolver';
import {
  buildBaseStats,
  parseAptitude,
  parseStrategy,
} from '@simulation/lib/RaceSolverBuilder';
import type {
  PhaseBreakdownRow,
  SkillEffect,
  StaminaCalculationResult,
  StaminaCalculatorInput,
} from '../types';
import skillData from '@/modules/data/skill_data.json';

const BaseAccel = 0.0006;
const UphillBaseAccel = 0.0004;

/**
 * Calculate skill proc rate based on wisdom
 */
function calculateSkillProcRate(wisdom: number): number {
  return Math.max(100 - 9000 / wisdom, 20) / 100;
}

/**
 * Calculate rushing rate based on wisdom
 */
function calculateRushingRate(wisdom: number): number {
  return Math.pow(6.5 / Math.log10(0.1 * wisdom + 1), 2) / 100;
}

/**
 * Get skill effects (recovery or debuffs)
 */
function getSkillEffects(
  skillIds: Array<string>,
  maxHp: number,
  considerProcRate: boolean,
  wisdom: number,
): Array<SkillEffect> {
  const effects: Array<SkillEffect> = [];
  const procRate = considerProcRate ? calculateSkillProcRate(wisdom) : 1.0;

  for (const skillId of skillIds) {
    const skill = skillData[skillId as keyof typeof skillData];
    if (!skill || typeof skill !== 'object') continue;

    // Access skill properties safely - type guard for skill structure
    const skillObj = skill as {
      name?: string;
      alternatives?: Array<{
        effects?: Array<{
          type: number;
          modifier: number;
        }>;
      }>;
    };

    const skillName = skillObj.name || skillId;

    // Check if skill has alternatives array
    if (!skillObj.alternatives || !Array.isArray(skillObj.alternatives))
      continue;

    // Look for recovery effects (type 9) in the first alternative
    const firstAlternative = skillObj.alternatives[0];
    if (
      !firstAlternative ||
      !firstAlternative.effects ||
      !Array.isArray(firstAlternative.effects)
    )
      continue;

    for (const effect of firstAlternative.effects) {
      if (effect.type === 9) {
        // Recovery type
        const basePercentage = effect.modifier / 10000; // Convert from basis points
        const effectivePercentage = basePercentage * procRate;
        const hpChange = effectivePercentage * maxHp;

        effects.push({
          skillId,
          skillName,
          hpChange,
          percentage: effectivePercentage * 100,
        });
      }
    }
  }

  return effects;
}

/**
 * Calculate HP consumption per second
 */
function calculateHpPerSecond(
  velocity: number,
  baseSpeed: number,
  groundCoef: number,
  gutsModifier: number,
  statusModifier: number = 1.0,
  inSpurtPhase: boolean = false,
): number {
  const guts = inSpurtPhase ? gutsModifier : 1.0;
  return (
    ((20.0 * Math.pow(velocity - baseSpeed + 12.0, 2)) / 144.0) *
    statusModifier *
    groundCoef *
    guts
  );
}

/**
 * Calculate acceleration for a phase
 */
function calculateAcceleration(
  power: number,
  strategy: number,
  phase: number,
  surfaceAptitude: number,
  distanceAptitude: number,
  isUphill: boolean = false,
): number {
  const baseAccel = isUphill ? UphillBaseAccel : BaseAccel;
  const strategyCoef = Acceleration.StrategyPhaseCoefficient[strategy][phase];
  const groundTypeCoef =
    Acceleration.GroundTypeProficiencyModifier[surfaceAptitude];
  const distanceCoef =
    Acceleration.DistanceProficiencyModifier[distanceAptitude];

  return (
    baseAccel *
    Math.sqrt(500.0 * power) *
    strategyCoef *
    groundTypeCoef *
    distanceCoef
  );
}

/**
 * Main calculation function
 */
export function calculateStaminaResult(
  input: StaminaCalculatorInput,
): StaminaCalculationResult {
  // Parse aptitudes and strategy
  const strategy = parseStrategy(input.strategy);
  const distanceAptitude = parseAptitude(input.distanceAptitude, 'distance');
  const surfaceAptitude = parseAptitude(input.surfaceAptitude, 'surface');

  // Get course data
  const course = CourseHelpers.getCourse(input.courseId);
  const distance = course.distance;
  const baseSpeed = 20.0 - (distance - 2000) / 1000.0;

  // Calculate base stats (after motivation)
  const baseStats = buildBaseStats({
    speed: input.speed,
    stamina: input.stamina,
    power: input.power,
    guts: input.guts,
    wisdom: input.wisdom,
    strategy: input.strategy,
    distanceAptitude: input.distanceAptitude,
    surfaceAptitude: input.surfaceAptitude,
    strategyAptitude: input.strategyAptitude,
    mood: input.mood,
  });

  // Calculate adjusted stats (no ground modifiers for stamina/guts)
  const adjustedStats = {
    speed: baseStats.speed,
    stamina: baseStats.stamina,
    power: baseStats.power,
    guts: baseStats.guts,
    wisdom: baseStats.wisdom,
  };

  // Calculate max HP
  const maxHp =
    0.8 * HpStrategyCoefficient[strategy] * adjustedStats.stamina + distance;

  // Get ground consumption modifier
  const groundCoef =
    HpConsumptionGroundModifier[course.surface]?.[input.groundCondition] ?? 1.0;

  // Calculate guts modifier (for late-race/spurt)
  const gutsModifier = 1.0 + 200.0 / Math.sqrt(600.0 * adjustedStats.guts);

  // Calculate speeds for each phase
  const phase0Speed = baseSpeed * Speed.StrategyPhaseCoefficient[strategy][0];
  const phase1Speed = baseSpeed * Speed.StrategyPhaseCoefficient[strategy][1];
  const baseTargetSpeed2 =
    baseSpeed * Speed.StrategyPhaseCoefficient[strategy][2] +
    Math.sqrt(500.0 * adjustedStats.speed) *
      Speed.DistanceProficiencyModifier[distanceAptitude] *
      0.002;

  // Calculate max spurt speed (includes guts component - post-1st anniversary)
  const maxSpurtSpeed =
    (baseTargetSpeed2 + 0.01 * baseSpeed) * 1.05 +
    Math.sqrt(500.0 * adjustedStats.speed) *
      Speed.DistanceProficiencyModifier[distanceAptitude] *
      0.002 +
    Math.pow(450.0 * adjustedStats.guts, 0.597) * 0.0001;

  // Calculate skill effects
  const recoverySkillEffects = getSkillEffects(
    input.recoverySkills,
    maxHp,
    input.considerSkillProcRate,
    baseStats.wisdom, // Use base wisdom for proc rate
  );

  const debuffSkillEffects = getSkillEffects(
    input.debuffSkills,
    maxHp,
    input.considerSkillProcRate,
    baseStats.wisdom,
  ).map((effect) => ({
    ...effect,
    hpChange: -Math.abs(effect.hpChange), // Ensure debuffs are negative
  }));

  const totalRecovery = recoverySkillEffects.reduce(
    (sum, effect) => sum + effect.hpChange,
    0,
  );
  const totalDrain = Math.abs(
    debuffSkillEffects.reduce((sum, effect) => sum + effect.hpChange, 0),
  );
  const netHpEffect = totalRecovery - totalDrain;

  // Calculate detailed phase breakdown
  const phases: Array<PhaseBreakdownRow> = [];

  // Start Dash phase
  const startDashAccel =
    24.0 +
    calculateAcceleration(
      adjustedStats.power,
      strategy,
      0,
      surfaceAptitude,
      distanceAptitude,
    );
  const startDashEndSpeed = 0.85 * baseSpeed;
  const startDashTime = (startDashEndSpeed - 3.0) / startDashAccel;
  const startDashDistance =
    3.0 * startDashTime + 0.5 * startDashAccel * startDashTime * startDashTime;
  const startDashAvgSpeed = (3.0 + startDashEndSpeed) / 2;
  const startDashHp =
    calculateHpPerSecond(
      startDashAvgSpeed,
      baseSpeed,
      groundCoef,
      gutsModifier,
      1.0,
      false,
    ) * startDashTime;

  phases.push({
    phaseName: 'Starting Gate',
    startSpeed: 3.0,
    goalSpeed: startDashEndSpeed,
    acceleration: startDashAccel,
    timeSeconds: startDashTime,
    distanceMeters: startDashDistance,
    hpConsumption: startDashHp,
  });

  // Phase 0 (Early-race) - Acceleration
  const phase0Accel = calculateAcceleration(
    adjustedStats.power,
    strategy,
    0,
    surfaceAptitude,
    distanceAptitude,
  );
  const phase0AccelTime = (phase0Speed - startDashEndSpeed) / phase0Accel;
  const phase0AccelDistance =
    startDashEndSpeed * phase0AccelTime +
    0.5 * phase0Accel * phase0AccelTime * phase0AccelTime;
  const phase0AccelAvgSpeed = (startDashEndSpeed + phase0Speed) / 2;
  const phase0AccelHp =
    calculateHpPerSecond(
      phase0AccelAvgSpeed,
      baseSpeed,
      groundCoef,
      gutsModifier,
      1.0,
      false,
    ) * phase0AccelTime;

  phases.push({
    phaseName: 'Early-race (Accelerating)',
    startSpeed: startDashEndSpeed,
    goalSpeed: phase0Speed,
    acceleration: phase0Accel,
    timeSeconds: phase0AccelTime,
    distanceMeters: phase0AccelDistance,
    hpConsumption: phase0AccelHp,
  });

  // Phase 0 (Early-race) - Top Speed
  const phase0Distance = distance / 6;
  const phase0TopDistance = Math.max(
    0,
    phase0Distance - startDashDistance - phase0AccelDistance,
  );
  const phase0TopTime = phase0TopDistance / phase0Speed;
  const phase0TopHp =
    calculateHpPerSecond(
      phase0Speed,
      baseSpeed,
      groundCoef,
      gutsModifier,
      1.0,
      false,
    ) * phase0TopTime;

  phases.push({
    phaseName: 'Early-race (Top Speed)',
    startSpeed: phase0Speed,
    goalSpeed: phase0Speed,
    acceleration: 0,
    timeSeconds: phase0TopTime,
    distanceMeters: phase0TopDistance,
    hpConsumption: phase0TopHp,
  });

  // Phase 1 (Mid-race) - Acceleration
  const phase1Accel = calculateAcceleration(
    adjustedStats.power,
    strategy,
    1,
    surfaceAptitude,
    distanceAptitude,
  );
  const phase1AccelTime = (phase1Speed - phase0Speed) / phase1Accel;
  const phase1AccelDistance =
    phase0Speed * phase1AccelTime +
    0.5 * phase1Accel * phase1AccelTime * phase1AccelTime;
  const phase1AccelAvgSpeed = (phase0Speed + phase1Speed) / 2;
  const phase1AccelHp =
    calculateHpPerSecond(
      phase1AccelAvgSpeed,
      baseSpeed,
      groundCoef,
      gutsModifier,
      1.0,
      false,
    ) * phase1AccelTime;

  phases.push({
    phaseName: 'Mid-race (Accelerating)',
    startSpeed: phase0Speed,
    goalSpeed: phase1Speed,
    acceleration: phase1Accel,
    timeSeconds: phase1AccelTime,
    distanceMeters: phase1AccelDistance,
    hpConsumption: phase1AccelHp,
  });

  // Phase 1 (Mid-race) - Top Speed
  const phase1Distance = (distance * 2) / 3 - phase0Distance;
  const phase1TopDistance = Math.max(0, phase1Distance - phase1AccelDistance);
  const phase1TopTime = phase1TopDistance / phase1Speed;
  const phase1TopHp =
    calculateHpPerSecond(
      phase1Speed,
      baseSpeed,
      groundCoef,
      gutsModifier,
      1.0,
      false,
    ) * phase1TopTime;

  phases.push({
    phaseName: 'Mid-race (Top Speed)',
    startSpeed: phase1Speed,
    goalSpeed: phase1Speed,
    acceleration: 0,
    timeSeconds: phase1TopTime,
    distanceMeters: phase1TopDistance,
    hpConsumption: phase1TopHp,
  });

  // Phase 2 (Late-race) - Acceleration to spurt
  const phase2Accel = calculateAcceleration(
    adjustedStats.power,
    strategy,
    2,
    surfaceAptitude,
    distanceAptitude,
  );
  const phase2AccelTime = (maxSpurtSpeed - phase1Speed) / phase2Accel;
  const phase2AccelDistance =
    phase1Speed * phase2AccelTime +
    0.5 * phase2Accel * phase2AccelTime * phase2AccelTime;
  const phase2AccelAvgSpeed = (phase1Speed + maxSpurtSpeed) / 2;
  const phase2AccelHp =
    calculateHpPerSecond(
      phase2AccelAvgSpeed,
      baseSpeed,
      groundCoef,
      gutsModifier,
      1.0,
      true,
    ) * phase2AccelTime;

  phases.push({
    phaseName: 'Late-race (Accelerating)',
    startSpeed: phase1Speed,
    goalSpeed: maxSpurtSpeed,
    acceleration: phase2Accel,
    timeSeconds: phase2AccelTime,
    distanceMeters: phase2AccelDistance,
    hpConsumption: phase2AccelHp,
  });

  // Phase 2 (Late-race) - Spurt speed
  const phase2Distance = (distance * 5) / 6 - (distance * 2) / 3;
  const phase2TopDistance = Math.max(0, phase2Distance - phase2AccelDistance);
  const phase2TopTime = phase2TopDistance / maxSpurtSpeed;
  const phase2TopHp =
    calculateHpPerSecond(
      maxSpurtSpeed,
      baseSpeed,
      groundCoef,
      gutsModifier,
      1.0,
      true,
    ) * phase2TopTime;

  phases.push({
    phaseName: 'Late-race (Top Speed)',
    startSpeed: maxSpurtSpeed,
    goalSpeed: maxSpurtSpeed,
    acceleration: 0,
    timeSeconds: phase2TopTime,
    distanceMeters: phase2TopDistance,
    hpConsumption: phase2TopHp,
  });

  // Phase 3 (Last Spurt) - Acceleration (if any)
  const phase3Accel = calculateAcceleration(
    adjustedStats.power,
    strategy,
    2, // Use phase 2 coefficients
    surfaceAptitude,
    distanceAptitude,
  );
  const phase3AccelTime = 0; // Assume already at max speed
  const phase3AccelDistance = 0;
  const phase3AccelHp = 0;

  if (phase3AccelTime > 0) {
    phases.push({
      phaseName: 'Last Spurt (Accelerating)',
      startSpeed: maxSpurtSpeed,
      goalSpeed: maxSpurtSpeed,
      acceleration: phase3Accel,
      timeSeconds: phase3AccelTime,
      distanceMeters: phase3AccelDistance,
      hpConsumption: phase3AccelHp,
    });
  }

  // Phase 3 (Last Spurt) - Full spurt (excluding 60m buffer)
  const phase3Distance = distance - (distance * 5) / 6 - 60;
  const phase3TopDistance = Math.max(0, phase3Distance - phase3AccelDistance);
  const phase3TopTime = phase3TopDistance / maxSpurtSpeed;
  const phase3TopHp =
    calculateHpPerSecond(
      maxSpurtSpeed,
      baseSpeed,
      groundCoef,
      gutsModifier,
      1.0,
      true,
    ) * phase3TopTime;

  phases.push({
    phaseName: 'Last Spurt (Top Speed)',
    startSpeed: maxSpurtSpeed,
    goalSpeed: maxSpurtSpeed,
    acceleration: 0,
    timeSeconds: phase3TopTime,
    distanceMeters: phase3TopDistance,
    hpConsumption: phase3TopHp,
  });

  // Calculate totals
  const totalHpNeeded = phases.reduce(
    (sum, phase) => sum + phase.hpConsumption,
    0,
  );
  const hpRemaining = maxHp + netHpEffect - totalHpNeeded;
  const canMaxSpurt = hpRemaining >= 0;

  // Calculate required stamina
  const requiredStamina = Math.ceil(
    (totalHpNeeded - netHpEffect - distance) /
      (0.8 * HpStrategyCoefficient[strategy]),
  );
  const staminaDeficit = Math.max(0, requiredStamina - adjustedStats.stamina);

  // Calculate rates
  const skillProcRate = calculateSkillProcRate(baseStats.wisdom);
  const rushingRate = calculateRushingRate(baseStats.wisdom);

  return {
    input,
    adjustedStats,
    maxHp,
    totalHpNeeded,
    hpRemaining,
    canMaxSpurt,
    requiredStamina,
    staminaDeficit,
    totalRecovery,
    totalDrain,
    netHpEffect,
    recoverySkillEffects,
    debuffSkillEffects,
    skillProcRate,
    rushingRate,
    maxSpurtSpeed,
    baseTargetSpeed2,
    phases,
    calculatedAt: Date.now(),
  };
}
