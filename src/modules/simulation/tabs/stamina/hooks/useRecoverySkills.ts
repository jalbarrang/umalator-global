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
}

// Helper to identify recovery skills and extract their recovery amounts
export function getRecoverySkillInfo(skillId: string): {
  isRecovery: boolean;
  modifier: number;
} {
  const data = getSkillDataById(skillId);
  const effect = data?.alternatives?.[0]?.effects?.find(
    (e: { type: number }) => e.type === 9,
  );
  return { isRecovery: !!effect, modifier: effect?.modifier ?? 0 };
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
function getEstimatedPosition(
  skillId: string,
  courseDistance: number,
): number {
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
 */
export function useActualRecoverySkills(
  skillData: Map<string, [number, number][]> | undefined,
  maxHp: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    if (!skillData) return [];

    const skills: RecoverySkillActivation[] = [];
    for (const [skillId, positions] of skillData.entries()) {
      const { isRecovery, modifier } = getRecoverySkillInfo(skillId);
      if (isRecovery) {
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
          });
        });
      }
    }
    return skills.sort((a, b) => a.position - b.position);
  }, [skillData, maxHp]);
}

/**
 * Calculate theoretical recovery skills from equipped skills
 */
export function useTheoreticalRecoverySkills(
  runner: RunnerState,
  maxHp: number,
  courseDistance: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    const skills: RecoverySkillActivation[] = [];

    for (const skillId of runner.skills) {
      const { isRecovery, modifier } = getRecoverySkillInfo(skillId);
      if (isRecovery) {
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
        });
      }
    }

    return skills.sort((a, b) => a.position - b.position);
  }, [runner.skills, maxHp, courseDistance]);
}

