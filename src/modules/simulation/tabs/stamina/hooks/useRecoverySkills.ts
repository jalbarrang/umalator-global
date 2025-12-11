import { useMemo } from 'react';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import {
  getSkillDataById,
  getSkillNameById,
  estimateSkillActivationPhase,
} from '@/modules/skills/utils';
import { SkillTarget, SkillType } from '@simulation/lib/race-solver/types';
import { SkillActivationMap } from '@/modules/simulation/compare.types';

export interface RecoverySkillActivation {
  skillId: string;
  skillName: string;
  position: number;
  hpRecovered: number;
  isEstimated: boolean;
  isDebuff: boolean; // true if this drains HP rather than recovering it
}

type StaminaRecoveryResult = {
  staminaRecovered: number;
  hasRecovery: boolean;
};

export function applyStaminaRecovery(skillId: string): StaminaRecoveryResult {
  const data = getSkillDataById(skillId);

  const result: StaminaRecoveryResult = {
    staminaRecovered: 0,
    hasRecovery: false,
  };

  for (const alternative of data.alternatives) {
    const effects = alternative.effects;
    // Filter for type 9 (Recovery) effects
    const recoveryEffects = effects.filter(
      (e) => e.type === SkillType.Recovery,
    );

    for (const effect of recoveryEffects) {
      const isTargetSelf = effect.target === SkillTarget.Self;

      if (isTargetSelf) {
        result.staminaRecovered += effect.modifier;
        result.hasRecovery = true;
      }
    }
  }

  return result;
}

type StaminaDrainResult = {
  staminaDrain: number;
  hasStaminaDrain: boolean;
};

export function applyStaminaDrain(skillId: string): StaminaDrainResult {
  const data = getSkillDataById(skillId);

  const result: StaminaDrainResult = {
    staminaDrain: 0,
    hasStaminaDrain: false,
  };

  for (const alternative of data.alternatives) {
    const effects = alternative.effects;
    // Filter for type 9 (Recovery/Stamina Drain) effects
    const recoveryEffects = effects.filter(
      (e) => e.type === SkillType.Recovery,
    );

    for (const effect of recoveryEffects) {
      const doesntTargetSelf = effect.target !== SkillTarget.Self;

      if (doesntTargetSelf) {
        result.staminaDrain += effect.modifier;
        result.hasStaminaDrain = true;
      }
    }
  }

  return result;
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

    if (!boundary) {
      throw new Error(`Invalid phase: ${phase}`);
    }

    // Use midpoint of the phase
    const midpoint = (boundary.start + boundary.end) / 2;
    return courseDistance * midpoint;
  }

  // Default to mid-race midpoint (~40% of course) if phase undeterminable
  return courseDistance * 0.4;
}

/**
 * Extract recovery skills from actual simulation data
 * Includes both pure heals and self-heals from dual-effect debuff skills
 */
export function useActualRecoverySkills(
  skillData: SkillActivationMap | undefined,
  maxHp: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    if (!skillData) return [];

    const skills: RecoverySkillActivation[] = [];

    for (const [skillId, activations] of skillData.entries()) {
      const { staminaRecovered, hasRecovery } = applyStaminaRecovery(skillId);

      // Include skills that have self-healing (positive or from dual-effect debuffs)
      if (hasRecovery) {
        const skillName = getSkillNameById(skillId);
        // Recovery modifier is percentage of max HP (divided by 10000)
        const hpRecovered = (staminaRecovered / 10000) * maxHp;

        for (const [start, _end, perspective, type] of activations) {
          if (type !== 'heal' || perspective !== 'self') continue;

          skills.push({
            skillId,
            skillName,
            position: start,
            hpRecovered,
            isEstimated: false,
            isDebuff: false,
          });
        }
      }
    }

    return skills.toSorted((a, b) => a.position - b.position);
  }, [skillData, maxHp]);
}

/**
 * Extract debuffs received from actual simulation data
 * These are HP drain skills used by opponents against this runner
 */
export function useActualDebuffsReceived(
  skillsSet: SkillActivationMap | undefined,
  maxHp: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    if (!skillsSet) return [];

    const skills: RecoverySkillActivation[] = [];
    for (const [skillId, activations] of skillsSet.entries()) {
      const { staminaDrain, hasStaminaDrain } = applyStaminaDrain(skillId);

      // Only include skills that have debuff effects on others
      if (hasStaminaDrain) {
        const skillName = getSkillNameById(skillId);

        // Modifier is typically negative, so hpRecovered will be negative (HP drain)
        const hpRecovered = (staminaDrain / 10000) * maxHp;

        for (const [start, _end, perspective, type] of activations) {
          if (type !== 'debuff' || perspective === 'self') continue;

          skills.push({
            skillId,
            skillName,
            position: start,
            hpRecovered, // This will be negative
            isEstimated: false,
            isDebuff: true,
          });
        }
      }
    }

    return skills.toSorted((a, b) => a.position - b.position);
  }, [skillsSet, maxHp]);
}

/**
 * Calculate theoretical recovery skills from equipped skills
 * Includes both pure heals and self-heals from dual-effect debuff skills
 */
export function useTheoreticalRecoverySkills(
  runner: RunnerState,
  maxHp: number,
  courseDistance: number,
): RecoverySkillActivation[] {
  return useMemo(() => {
    const skills: RecoverySkillActivation[] = [];

    for (const skillId of runner.skills) {
      const { staminaRecovered, hasRecovery } = applyStaminaRecovery(skillId);

      // Include skills that have self-healing
      if (hasRecovery) {
        const skillName = getSkillNameById(skillId);
        // Recovery modifier is percentage of max HP (divided by 10000)
        const hpRecovered = (staminaRecovered / 10000) * maxHp;
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

    return skills.toSorted((a, b) => a.position - b.position);
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
      const { staminaDrain, hasStaminaDrain } = applyStaminaDrain(skillId);

      // Only include skills that have debuff effects
      if (hasStaminaDrain) {
        const skillName = getSkillNameById(skillId);
        // Modifier is typically negative, so hpRecovered will be negative (HP drain)
        const hpRecovered = (staminaDrain / 10000) * maxHp;
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

    return skills.toSorted((a, b) => a.position - b.position);
  }, [opponent.skills, maxHp, courseDistance]);
}
