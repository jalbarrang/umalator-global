import { useMemo } from 'react';
import { buildBaseStats } from '@simulation/lib/RaceSolverBuilder';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import {
  HpConsumptionGroundModifier,
  HpStrategyCoefficient,
} from '@/modules/simulation/lib/HpPolicy';
import { Speed } from '@/modules/simulation/lib/RaceSolver';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import {
  calculateBaseMidRaceTargetSpeed,
  calculateBaseSpeed,
  calculateGutsModifier,
  calculateMaxHP,
  calculateMaxSpurtSpeed,
  calculateRequiredHpForLastSpurt,
} from '@/modules/simulation/lib/SpurtCalculator';

export interface PhaseBreakdown {
  phase: string;
  startDistance: number;
  endDistance: number;
  speed: number;
  hpConsumed: number;
  timeSeconds: number;
}

export interface StaminaAnalysis {
  maxHp: number;
  totalHpNeeded: number;
  hpRemaining: number;
  canMaxSpurt: boolean;
  requiredStamina: number;
  staminaDeficit: number;
  phases: Array<PhaseBreakdown>;
  maxSpurtSpeed: number;
  baseTargetSpeed2: number;
}

const EarlyRacePhase = 0;
const MidRacePhase = 1;
const LateRacePhase = 2;
// const LastSpurtPhase = 3;

export function calculateStaminaAnalysis(
  runner: RunnerState,
  courseId: number,
  groundCondition: number,
): StaminaAnalysis {
  const course = CourseHelpers.getCourse(courseId);

  const runnerBaseStats = buildBaseStats({
    speed: runner.speed,
    stamina: runner.stamina,
    power: runner.power,
    guts: runner.guts,
    wisdom: runner.wisdom,
    strategy: runner.strategy,
    distanceAptitude: runner.distanceAptitude,
    surfaceAptitude: runner.surfaceAptitude,
    strategyAptitude: runner.strategyAptitude,
    mood: runner.mood,
  });

  const strategy = runnerBaseStats.strategy;
  const distanceAptitude = runnerBaseStats.distanceAptitude;

  const gutsModifier = calculateGutsModifier(runnerBaseStats.guts);
  const hpStrategyCoefficient = HpStrategyCoefficient[strategy];
  const groundModifier =
    HpConsumptionGroundModifier[course.surface]?.[groundCondition] ?? 1.0;

  const speedStrategyCoefficient = Speed.StrategyPhaseCoefficient[strategy];
  const distanceProficiencyModifier =
    Speed.DistanceProficiencyModifier[distanceAptitude];

  const distance = course.distance;
  const baseSpeed = calculateBaseSpeed(distance);

  const maxHp = calculateMaxHP({
    coefficient: hpStrategyCoefficient,
    stamina: runnerBaseStats.stamina,
    distance: distance,
  });

  // Calculate speeds for each phase
  const phase0Speed = baseSpeed * speedStrategyCoefficient[EarlyRacePhase];
  const phase1Speed = baseSpeed * speedStrategyCoefficient[MidRacePhase];

  const baseMidRaceTargetSpeed = calculateBaseMidRaceTargetSpeed({
    runnerSpeed: runnerBaseStats.speed,
    baseSpeed: baseSpeed,
    strategySpeedCoefficient: speedStrategyCoefficient[LateRacePhase],
    distanceProficiencyModifier: distanceProficiencyModifier,
  });

  // Calculate max spurt speed (includes guts component - post-1st anniversary)
  const maxSpurtSpeed = calculateMaxSpurtSpeed({
    runnerSpeed: runnerBaseStats.speed,
    runnerGuts: runnerBaseStats.guts,
    baseSpeed: baseSpeed,
    baseMidRaceTargetSpeed: baseMidRaceTargetSpeed,
    distanceProficiencyModifier: distanceProficiencyModifier,
  });

  // Phase distances (matching game terminology)
  // Phase 0 (Early-race): 0 to 1/6 (~16.7%)
  // Phase 1 (Mid-race): 1/6 to 2/3 (~16.7% to ~66.7%)
  // Phase 2 (Late-race/Final leg): 2/3 to 5/6 (~66.7% to ~83.3%)
  // Phase 3 (Last Spurt): 5/6 to finish (~83.3% to 100%)
  const phase0Distance = distance / 6;
  const phase1Distance = (distance * 2) / 3 - phase0Distance;
  const phase2Distance = (distance * 5) / 6 - (distance * 2) / 3;
  const phase3Distance = distance - (distance * 5) / 6 - 60; // 60m buffer

  // HP consumption formula: 20 * (velocity - baseSpeed + 12)² / 144 * groundModifier * gutsModifier
  const calcHpPerSecond = (velocity: number, isLatePhase: boolean) => {
    const guts = isLatePhase ? gutsModifier : 1.0;
    return (
      ((20.0 * Math.pow(velocity - baseSpeed + 12.0, 2)) / 144.0) *
      groundModifier *
      guts
    );
  };

  // Phase 0 (Early-race)
  const phase0HpPerSec = calcHpPerSecond(phase0Speed, false);
  const phase0Time = phase0Distance / phase0Speed;
  const phase0Hp = phase0HpPerSec * phase0Time;

  // Phase 1 (Mid-race)
  const phase1HpPerSec = calcHpPerSecond(phase1Speed, false);
  const phase1Time = phase1Distance / phase1Speed;
  const phase1Hp = phase1HpPerSec * phase1Time;

  // Phase 2 (Late-race) - uses guts modifier and max spurt speed
  const phase2HpPerSec = calcHpPerSecond(maxSpurtSpeed, true);
  const phase2Time = phase2Distance / maxSpurtSpeed;
  const phase2Hp = phase2HpPerSec * phase2Time;

  // Phase 3 (Last Spurt) - uses guts modifier and max spurt speed
  const phase3HpPerSec = calcHpPerSecond(maxSpurtSpeed, true);
  const phase3Time = phase3Distance / maxSpurtSpeed;
  const phase3Hp = phase3HpPerSec * phase3Time;

  const totalHpNeeded = phase0Hp + phase1Hp + phase2Hp + phase3Hp;
  const hpRemaining = maxHp - totalHpNeeded;
  const canMaxSpurt = hpRemaining >= 0;

  // Calculate required stamina for max spurt
  // Solve: 0.8 * coef * stamina + distance >= totalHpNeeded
  // stamina >= (totalHpNeeded - distance) / (0.8 * coef)
  const requiredStamina = calculateRequiredHpForLastSpurt({
    totalHpNeeded: totalHpNeeded,
    distance: distance,
    hpStrategyCoefficient: hpStrategyCoefficient,
  });

  const staminaDeficit = Math.max(0, requiredStamina - runnerBaseStats.stamina);

  // Calculate phase start/end positions
  const phase0Start = 0;
  const phase0End = phase0Distance;
  const phase1Start = phase0End;
  const phase1End = phase1Start + phase1Distance;
  const phase2Start = phase1End;
  const phase2End = phase2Start + phase2Distance;
  const phase3Start = phase2End;
  const phase3End = distance;

  const phases: Array<PhaseBreakdown> = [
    {
      phase: 'Early-race',
      startDistance: phase0Start,
      endDistance: phase0End,
      speed: phase0Speed,
      hpConsumed: phase0Hp,
      timeSeconds: phase0Time,
    },
    {
      phase: 'Mid-race',
      startDistance: phase1Start,
      endDistance: phase1End,
      speed: phase1Speed,
      hpConsumed: phase1Hp,
      timeSeconds: phase1Time,
    },
    {
      phase: 'Final leg',
      startDistance: phase2Start,
      endDistance: phase2End,
      speed: maxSpurtSpeed,
      hpConsumed: phase2Hp,
      timeSeconds: phase2Time,
    },
    {
      phase: 'Last Spurt',
      startDistance: phase3Start,
      endDistance: phase3End,
      speed: maxSpurtSpeed,
      hpConsumed: phase3Hp,
      timeSeconds: phase3Time,
    },
  ];

  return {
    maxHp,
    totalHpNeeded,
    hpRemaining,
    canMaxSpurt,
    requiredStamina,
    staminaDeficit,
    phases,
    maxSpurtSpeed,
    baseTargetSpeed2: baseMidRaceTargetSpeed,
  };
}

export function useStaminaAnalysis(
  runner: RunnerState,
  courseId: number,
  groundCondition: number,
): StaminaAnalysis {
  return useMemo(() => {
    return calculateStaminaAnalysis(runner, courseId, groundCondition);
  }, [runner, courseId, groundCondition]);
}
