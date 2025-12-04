import { useMemo } from 'react';
import { PhaseBreakdown, StaminaAnalysis } from './useStaminaAnalysis';

export interface ActualPhaseHp {
  hpAtStart: number;
  hpAtEnd: number;
  hpConsumed: number;
}

/**
 * Helper to find HP at a specific position from simulation data
 */
function findHpAtPosition(
  positions: number[],
  hpValues: number[],
  targetPosition: number,
): number | null {
  if (!positions || !hpValues || positions.length === 0) return null;

  // Find the closest position index
  let closestIdx = 0;
  let closestDist = Math.abs(positions[0] - targetPosition);

  for (let i = 1; i < positions.length; i++) {
    const dist = Math.abs(positions[i] - targetPosition);
    if (dist < closestDist) {
      closestDist = dist;
      closestIdx = i;
    }
    // Early exit if we've passed the target and distance is increasing
    if (positions[i] > targetPosition && dist > closestDist) break;
  }

  return hpValues[closestIdx];
}

/**
 * Calculate actual HP values from simulation data
 */
export function useActualPhaseHp(
  positions: number[] | undefined,
  hpValues: number[] | undefined,
  phases: PhaseBreakdown[],
  maxHp: number,
): ActualPhaseHp[] | null {
  return useMemo(() => {
    if (!positions || !hpValues) return null;

    return phases.map((phase) => {
      const hpAtStart =
        findHpAtPosition(positions, hpValues, phase.startDistance) ?? maxHp;
      const hpAtEnd =
        findHpAtPosition(positions, hpValues, phase.endDistance) ?? 0;
      const hpConsumed = Math.max(0, hpAtStart - hpAtEnd);

      return { hpAtStart, hpAtEnd, hpConsumed };
    });
  }, [positions, hpValues, phases, maxHp]);
}

/**
 * Calculate theoretical HP values from analysis phases
 */
export function useTheoreticalPhaseHp(
  analysis: StaminaAnalysis,
): ActualPhaseHp[] {
  return useMemo(() => {
    return analysis.phases.map((phase, i) => {
      const hpUsedBefore = analysis.phases
        .slice(0, i)
        .reduce((sum, p) => sum + p.hpConsumed, 0);
      const hpAtStart = analysis.maxHp - hpUsedBefore;
      const hpAtEnd = hpAtStart - phase.hpConsumed;

      return {
        hpAtStart,
        hpAtEnd,
        hpConsumed: phase.hpConsumed,
      };
    });
  }, [analysis]);
}

