/**
 * Pure calculation formulas for race simulation
 * All functions here are stateless and deterministic
 */

import type { IPhase } from './types';
import type { IStrategy } from '../runner/types';

// ============================================================================
// Speed Formulas
// ============================================================================

/**
 * Calculate minimum speed a runner can maintain
 * Formula: 0.85 * BaseSpeed + sqrt(200 * GutsStat) * 0.001
 */
export function calculateMinimumSpeed(baseSpeed: number, runnerGuts: number): number {
  return 0.85 * baseSpeed + Math.sqrt(200.0 * runnerGuts) * 0.001;
}

/**
 * Calculate base speed for course distance
 * Formula: 20.0 - (CourseDistance - 2000) / 1000
 */
export function calculateBaseSpeedForDistance(distance: number): number {
  return 20.0 - (distance - 2000.0) / 1000.0;
}

/**
 * Calculate speed blocking factor when uma is blocked in front
 * Formula: (0.988 + 0.012 * (DistanceGap / 2m)) * SpeedOfBlockingUma
 *
 * @param distanceGap - Distance to blocking uma (0-2m)
 * @param blockingSpeed - Speed of the uma blocking in front
 */
export function calculateBlockedSpeedCap(distanceGap: number, blockingSpeed: number): number {
  // Linear scaling from 0.988x at 0m to 1.0x at 2m
  const factor = 0.988 + 0.012 * (distanceGap / 2.0);
  return factor * blockingSpeed;
}

// ============================================================================
// HP/Stamina Formulas
// ============================================================================

/**
 * Calculate HP consumption per second
 * Formula: ((20 * (CurrentSpeed - BaseSpeed + 12)^2) / 144) * StatusModifier * GroundModifier
 */
export function calculateHpConsumption(
  currentSpeed: number,
  baseSpeed: number,
  statusModifier: number,
  groundModifier: number,
): number {
  return (
    ((20.0 * Math.pow(currentSpeed - baseSpeed + 12.0, 2)) / 144.0) *
    statusModifier *
    groundModifier
  );
}

/**
 * Calculate guts modifier for HP consumption in late race (Phase 2+)
 * Formula: 1.0 + 200 / sqrt(600 * GutsStat)
 */
export function calculateGutsModifier(guts: number): number {
  return 1.0 + 200.0 / Math.sqrt(600.0 * guts);
}

/**
 * Calculate maximum HP from stamina
 * Formula: 0.8 * StrategyCoefficient * StaminaStat + CourseDistance
 */
export function calculateMaxHP(
  stamina: number,
  strategyCoefficient: number,
  courseDistance: number,
): number {
  return 0.8 * strategyCoefficient * stamina + courseDistance;
}

// ============================================================================
// Stat Clamping
// ============================================================================

/**
 * Clamp stat value between 1 and 2000 (applied at each stage)
 */
export function clampStat(value: number): number {
  return Math.max(1, Math.min(2000, value));
}

/**
 * Clamp target speed between minimum and maximum (30 m/s)
 */
export function clampTargetSpeed(
  targetSpeed: number,
  minSpeed: number,
  maxSpeed: number = 30.0,
): number {
  return Math.max(minSpeed, Math.min(maxSpeed, targetSpeed));
}

// ============================================================================
// Skill & Wisdom Formulas
// ============================================================================

/**
 * Calculate skill activation chance (pre-race wisdom check)
 * Formula: max(100 - 9000 / BaseWit, 20) [%]
 *
 * CRITICAL: Uses base wit stat (NOT adjusted by strategy proficiency or skills)
 */
export function calculateSkillActivationChance(baseWisdom: number): number {
  return Math.max(100.0 - 9000.0 / baseWisdom, 20.0) / 100.0;
}

/**
 * Calculate in-race wit check probability for dynamic conditions
 * Formula: max(100 - 9000 / runnerWit, 20) [%]
 */
export function calculateWisdomCheckProbability(runnerWit: number): number {
  return Math.max(100.0 - 9000.0 / runnerWit, 20.0) / 100.0;
}

/**
 * Calculate random speed variation per section based on wisdom
 * Returns [minVariation, maxVariation] as percentage modifiers
 *
 * MaxVariation = (WitStat / 5500) * log10(WitStat * 0.1) [%]
 * MinVariation = MaxVariation - 0.65 [%]
 */
export function calculateSpeedVariationRange(runnerWit: number): [number, number] {
  const maxVariation = (runnerWit / 5500.0) * Math.log10(runnerWit * 0.1);
  const minVariation = maxVariation - 0.65;
  return [minVariation / 100.0, maxVariation / 100.0];
}

// ============================================================================
// Special State Formulas
// ============================================================================

/**
 * Calculate Rushed Chance
 * Formula: (6.5 / log10(0.1 * WitStat + 1))^2 [%]
 */
export function calculateRushedChance(runnerWit: number): number {
  return Math.pow(6.5 / Math.log10(0.1 * runnerWit + 1), 2) / 100.0;
}

/**
 * Calculate Spot Struggle speed boost
 * Formula: (500 * GutsStat)^0.6 * 0.0001 [m/s]
 */
export function calculateSpotStruggleSpeedBoost(runnerGuts: number): number {
  return Math.pow(500.0 * runnerGuts, 0.6) * 0.0001;
}

/**
 * Calculate Spot Struggle duration
 * Formula: (700 * GutsStat)^0.5 * 0.012 [s]
 */
export function calculateSpotStruggleDuration(runnerGuts: number): number {
  return Math.pow(700.0 * runnerGuts, 0.5) * 0.012;
}

/**
 * Calculate Dueling speed boost
 * Formula: (200 * GutsStat)^0.708 * 0.0001 [m/s]
 */
export function calculateDuelingSpeedBoost(runnerGuts: number): number {
  return Math.pow(200.0 * runnerGuts, 0.708) * 0.0001;
}

/**
 * Calculate Dueling acceleration boost
 * Formula: (160 * GutsStat)^0.59 * 0.0001 [m/s²]
 */
export function calculateDuelingAccelBoost(runnerGuts: number): number {
  return Math.pow(160.0 * runnerGuts, 0.59) * 0.0001;
}

// ============================================================================
// Lane Movement Formulas
// ============================================================================

/**
 * Calculate lane change target speed
 * Formula: 0.02 * (0.3 + 0.001 * PowerStat) * FirstMoveLanePointMod * OrderMod
 *
 * @param power - Runner's power stat
 * @param firstMoveLanePointMod - Modifier before move lane point (1 + lane distance modifier)
 * @param orderMod - Modifier in late-race based on placement (1 + Order * 0.01)
 */
export function calculateLaneChangeTargetSpeed(
  runnerPower: number,
  firstMoveLanePointMod: number = 1.0,
  orderMod: number = 1.0,
): number {
  return 0.02 * (0.3 + 0.001 * runnerPower) * firstMoveLanePointMod * orderMod;
}

/**
 * Calculate lane movement speed modifier when changing lanes
 * Formula: (0.0002 * PowerStat)^0.5 [m/s]
 */
export function calculateMoveLaneModifier(runnerPower: number): number {
  return Math.sqrt(0.0002 * runnerPower);
}

/**
 * Calculate extra move lane (final corner lane) position
 * Formula: clamp(LaneDistance / 0.1, 0, 1) * 0.5 + random(0, 0.1)
 */
export function calculateExtraMoveLane(currentLane: number, randomValue: number): number {
  const clampedLane = Math.max(0, Math.min(1, currentLane / 0.1));
  return clampedLane * 0.5 + randomValue;
}

/**
 * Calculate force-in modifier for early race lane positioning
 * Formula: Random(0, 0.1) + StrategyModifier [m/s]
 *
 * Strategy modifiers:
 * - Front Runner: +0.02
 * - Pace Chaser: +0.01
 * - Late Surger: +0.01
 * - End Closer: +0.03
 */
export function calculateForceInModifier(strategy: IStrategy, randomValue: number): number {
  const strategyBonus = [0, 0.02, 0.01, 0.01, 0.03, 0.02][strategy]; // Includes Oonige at index 5
  return randomValue + strategyBonus;
}

// ============================================================================
// Blocking & Vision Formulas
// ============================================================================

/**
 * Check if uma is blocked in front
 *
 * @param distanceGap - Distance to uma ahead (positive = ahead)
 * @param laneGap - Lane distance to uma (in horse lanes)
 * @returns true if blocked
 */
export function isBlockedInFront(distanceGap: number, laneGap: number): boolean {
  if (distanceGap <= 0 || distanceGap >= 2.0) return false;

  // Lane gap threshold: 0.75 horse lane at 0m, 0.3 horse lane at 2m
  const laneThreshold = (1.0 - 0.6 * (distanceGap / 2.0)) * 0.75;
  return Math.abs(laneGap) <= laneThreshold;
}

/**
 * Check if uma is blocked on side
 *
 * @param distanceGap - Distance to uma (positive = ahead, negative = behind)
 * @param laneGap - Lane distance to uma (in horse lanes)
 * @returns true if blocked
 */
export function isBlockedOnSide(distanceGap: number, laneGap: number): boolean {
  return Math.abs(distanceGap) < 1.05 && Math.abs(laneGap) < 2.0;
}

/**
 * Check if two uma are overlapping
 *
 * @param distanceGap - Distance between uma
 * @param laneGap - Lane distance between uma (in horse lanes)
 * @returns true if overlapping
 */
export function isOverlapping(distanceGap: number, laneGap: number): boolean {
  return Math.abs(distanceGap) < 0.4 && Math.abs(laneGap) < 0.4;
}

/**
 * Check if uma is visible
 *
 * @param distanceGap - Distance to uma (negative = behind)
 * @param laneGap - Lane distance to uma (in horse lanes)
 * @param visibleDistance - Maximum visible distance (default 20m)
 * @returns true if visible
 */
export function isVisible(
  distanceGap: number,
  laneGap: number,
  visibleDistance: number = 20.0,
): boolean {
  if (distanceGap > visibleDistance) return false;

  // Vision cone: max width constant, scales with distance
  const maxLaneGap = ((distanceGap / visibleDistance) * 11.5 + 2.0) / 2.0;
  return Math.abs(laneGap) <= maxLaneGap;
}

/**
 * Check if uma is near (for near_count condition)
 *
 * @param distanceGap - Distance between uma
 * @param laneGap - Lane distance between uma (in horse lanes)
 */
export function isNear(distanceGap: number, laneGap: number): boolean {
  return Math.abs(distanceGap) < 3.0 && Math.abs(laneGap) < 3.0;
}

// ============================================================================
// Slope & Course Formulas
// ============================================================================

/**
 * Calculate uphill speed penalty
 * Formula: (SlopePer * 200) / PowerStat [m/s]
 *
 * @param slopePer - Slope percentage (tan(angle) * 100)
 * @param power - Runner's power stat
 */
export function calculateUphillSpeedPenalty(slopePer: number, power: number): number {
  return (slopePer * 200.0) / power;
}

/**
 * Calculate downhill acceleration mode speed boost
 * Formula: 0.3 + SlopePer/10 [m/s]
 *
 * @param slopePer - Slope percentage (negative for downhill)
 */
export function calculateDownhillSpeedBoost(slopePer: number): number {
  return 0.3 + Math.abs(slopePer) / 10.0;
}

/**
 * Check if slope is uphill (SlopePer > 1.0)
 */
export function isUphill(slopePer: number): boolean {
  return slopePer > 1.0;
}

/**
 * Check if slope is downhill (SlopePer < -1.0)
 */
export function isDownhill(slopePer: number): boolean {
  return slopePer < -1.0;
}

// ============================================================================
// Position Keeping Formulas
// ============================================================================

/**
 * Calculate position keep speed up Wit check probability
 * Formula: 20 * log10(WitStat * 0.1) [%]
 */
export function calculateSpeedUpWitCheck(runnerWit: number): number {
  return (20.0 * Math.log10(runnerWit * 0.1)) / 100.0;
}

/**
 * Calculate position keep pace up Wit check probability
 * Formula: 15 * log10(WitStat * 0.1) [%]
 */
export function calculatePaceUpWitCheck(runnerWit: number): number {
  return (15.0 * Math.log10(runnerWit * 0.1)) / 100.0;
}

/**
 * Calculate course factor for position keep distance thresholds
 * Formula: 0.0008 * (CourseLength - 1000) + 1.0
 */
export function calculatePositionKeepCourseFactor(courseDistance: number): number {
  return 0.0008 * (courseDistance - 1000.0) + 1.0;
}

// ============================================================================
// Phase & Section Helpers
// ============================================================================

/**
 * Calculate which section uma is in (1-24)
 */
export function calculateSection(position: number, sectionLength: number): number {
  return Math.floor(position / sectionLength) + 1;
}

/**
 * Calculate phase start position
 *
 * Phases:
 * - 0 (Early): 0.0 - 16.67% of distance
 * - 1 (Mid): 16.67% - 66.67% of distance
 * - 2 (Late): 66.67% - 100% of distance
 */
export function calculatePhaseStart(courseDistance: number, phase: IPhase): number {
  const phaseStarts = [0, 1 / 6, 2 / 3, 1.0];
  return courseDistance * phaseStarts[phase];
}

/**
 * Calculate phase end position
 */
export function calculatePhaseEnd(courseDistance: number, phase: IPhase): number {
  const phaseEnds = [1 / 6, 2 / 3, 1.0, 1.0];
  return courseDistance * phaseEnds[phase];
}

/**
 * Determine which phase a position is in
 */
export function determinePhase(position: number, courseDistance: number): IPhase {
  const ratio = position / courseDistance;
  if (ratio < 1 / 6) return 0; // Early race
  if (ratio < 2 / 3) return 1; // Mid race
  return 2; // Late race (becomes 3/Last Spurt when conditions met)
}

// ============================================================================
// Display Time Conversion
// ============================================================================

/**
 * Convert actual race time to displayed time
 * Formula: DisplayedTime = ActualTime * 1.18
 */
export function calculateDisplayTime(actualTime: number): number {
  return actualTime * 1.18;
}

/**
 * Convert displayed time back to actual time
 */
export function calculateActualTime(displayTime: number): number {
  return displayTime / 1.18;
}
