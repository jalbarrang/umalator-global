import { useMemo } from 'react';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import {
  getSkillDataById,
  getSkillNameById,
  estimateSkillActivationPhase,
} from '@/modules/skills/utils';

export interface RecoverySkillActivation {
  skillId: string;
  skillName: string;
  position: number;
  hpRecovered: number;
  isEstimated: boolean;
  isDebuff: boolean; // true if this drains HP rather than recovering it
}

// Helper to identify recovery/HP drain skills and extract their amounts
export function getRecoverySkillInfo(skillId: string): {
  isRecovery: boolean;
  modifier: number;
  isDebuff: boolean;
} {
  const data = getSkillDataById(skillId);
  const effect = data?.alternatives?.[0]?.effects?.find(
    (e: { type: number }) => e.type === 9,
  );
  const modifier = effect?.modifier ?? 0;
  return {
    isRecovery: !!effect,
    modifier,
    isDebuff: modifier < 0,
  };
}

// Phase boundaries per race mechanics (as percentage of course distance)
// Phase 0 (Early-race): Sections 1-4 (0% to ~16.7%)
// Phase 1 (Mid-race): Sections 5-16 (~16.7% to ~66.7%)
// Phase 2 (Late-race): Sections 17-20 (~66.7% to ~83.3%)
// Phase 3 (Last Spurt): Sections 21-24 (~83.3% to 100%)
const PHASE_BOUNDARIES = [
  { start: 0, end: 1 / 6 }, // Phase 0
  { start: 1 / 6, end: 2 / 3 }, // Phase 1
  { start: 2 / 3, end: 5 / 6 }, // Phase 2
  { start: 5 / 6, end: 1 }, // Phase 3
];

/**
 * Get estimated activation position for a skill based on its phase
 */
function getEstimatedPosition(skillId: string, courseDistance: number): number {
  const phase = estimateSkillActivationPhase(skillId);

  if (phase !== null && phase >= 0 && phase <= 3) {
    const boundary = PHASE_BOUNDARIES[phase];
    // Use midpoint of the phase
    const midpoint = (boundary.start + boundary.end) / 2;
    return courseDistance * midpoint;
  }

  // Default to mid-race midpoint (~40% of course) if phase undeterminable
  return courseDistance * 0.4;
}

/**
 * Extract recovery skills from actual simulation data
 * Only returns positive recovery skills (heals), not debuffs
 */
export function useActualRecoverySkills(
  skillData: Map<string, [number, number][]> | undefined,
  maxHp: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    if (!skillData) return [];

    const skills: RecoverySkillActivation[] = [];
    for (const [skillId, positions] of skillData.entries()) {
      const { isRecovery, modifier, isDebuff } = getRecoverySkillInfo(skillId);
      // Only include positive recovery skills (heals)
      if (isRecovery && !isDebuff) {
        const [skillName] = getSkillNameById(skillId);
        // Recovery modifier is percentage of max HP (divided by 10000)
        const hpRecovered = (modifier / 10000) * maxHp;

        positions.forEach(([start]) => {
          skills.push({
            skillId,
            skillName,
            position: start,
            hpRecovered,
            isEstimated: false,
            isDebuff: false,
          });
        });
      }
    }
    return skills.sort((a, b) => a.position - b.position);
  }, [skillData, maxHp]);
}

/**
 * Extract debuffs received from actual simulation data
 * These are HP drain skills used by opponents against this runner
 */
export function useActualDebuffsReceived(
  debuffsData: Map<string, [number, number][]> | undefined,
  maxHp: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    if (!debuffsData) return [];

    const skills: RecoverySkillActivation[] = [];
    for (const [skillId, positions] of debuffsData.entries()) {
      const { isRecovery, modifier, isDebuff } = getRecoverySkillInfo(skillId);
      // Only include debuffs (negative HP effects)
      if (isRecovery && isDebuff) {
        const [skillName] = getSkillNameById(skillId);
        // Modifier is negative, so hpRecovered will be negative (HP drain)
        const hpRecovered = (modifier / 10000) * maxHp;

        positions.forEach(([start]) => {
          skills.push({
            skillId,
            skillName,
            position: start,
            hpRecovered, // This will be negative
            isEstimated: false,
            isDebuff: true,
          });
        });
      }
    }
    return skills.sort((a, b) => a.position - b.position);
  }, [debuffsData, maxHp]);
}

/**
 * Calculate theoretical recovery skills from equipped skills
 * Only returns positive recovery skills (heals), not self-debuffs
 */
export function useTheoreticalRecoverySkills(
  runner: RunnerState,
  maxHp: number,
  courseDistance: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    const skills: RecoverySkillActivation[] = [];

    for (const skillId of runner.skills) {
      const { isRecovery, modifier, isDebuff } = getRecoverySkillInfo(skillId);
      // Only include positive recovery skills (heals)
      if (isRecovery && !isDebuff) {
        const [skillName] = getSkillNameById(skillId);
        // Recovery modifier is percentage of max HP (divided by 10000)
        const hpRecovered = (modifier / 10000) * maxHp;
        const position = getEstimatedPosition(skillId, courseDistance);

        skills.push({
          skillId,
          skillName,
          position,
          hpRecovered,
          isEstimated: true,
          isDebuff: false,
        });
      }
    }

    return skills.sort((a, b) => a.position - b.position);
  }, [runner.skills, maxHp, courseDistance]);
}

/**
 * Calculate theoretical debuffs from opponent's equipped skills
 * These are HP drain skills that could be used against this runner
 */
export function useTheoreticalDebuffsReceived(
  opponent: RunnerState,
  maxHp: number,
  courseDistance: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    const skills: RecoverySkillActivation[] = [];

    for (const skillId of opponent.skills) {
      const { isRecovery, modifier, isDebuff } = getRecoverySkillInfo(skillId);
      // Only include debuffs (negative HP effects targeting others)
      if (isRecovery && isDebuff) {
        const [skillName] = getSkillNameById(skillId);
        // Modifier is negative, so hpRecovered will be negative (HP drain)
        const hpRecovered = (modifier / 10000) * maxHp;
        const position = getEstimatedPosition(skillId, courseDistance);

        skills.push({
          skillId,
          skillName,
          position,
          hpRecovered, // This will be negative
          isEstimated: true,
          isDebuff: true,
        });
      }
    }

    return skills.sort((a, b) => a.position - b.position);
  }, [opponent.skills, maxHp, courseDistance]);
}
