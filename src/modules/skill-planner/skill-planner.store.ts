import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { cloneDeep } from 'es-toolkit';
import { generateSeed } from '@/utils/crypto';
import { createRunnerState } from '../runners/components/runner-card/types';
import type { RunnerState } from '../runners/components/runner-card/types';
import type { CandidateSkill, OptimizationProgress, OptimizationResult } from './types';
import type { ISkill } from '@/modules/skills/types';
import {
  getBaseTier,
  getGoldVersion,
  getUpgradeTier,
  getWhiteVersion,
  isStackableSkill,
} from '@/modules/skills/skill-relationships';
import { getSkillById, getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import GametoraSkills from '@/modules/data/gametora/skills.json';

interface SkillPlannerState {
  runner: RunnerState;
  // Candidate skills
  candidates: Record<string, CandidateSkill>;
  // Obtained skills (career baseline) - separate from candidates
  obtainedSkills: Array<string>;

  // Budget and modifiers
  budget: number;
  hasFastLearner: boolean;

  // Optimization state
  seed: number | null;
  isOptimizing: boolean;
  progress: OptimizationProgress | null;
  result: OptimizationResult | null;

  // Skill UI State
  skillDrawerOpen: boolean;
}

export const useSkillPlannerStore = create<SkillPlannerState>()(
  persist(
    (_) => ({
      runner: createRunnerState(),
      candidates: {},
      obtainedSkills: [],
      budget: 1000,
      hasFastLearner: false,
      seed: null,
      isOptimizing: false,
      progress: null,
      result: null,
      // Skill UI State
      skillDrawerOpen: false,
    }),
    {
      name: 'umalator-skill-planner',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        runner: state.runner,
        candidates: state.candidates,
        obtainedSkills: state.obtainedSkills,
        budget: state.budget,
        hasFastLearner: state.hasFastLearner,
      }),
    },
  ),
);

// Actions

export const setSkillsOpen = (open: boolean) => {
  useSkillPlannerStore.setState({ skillDrawerOpen: open });
};

export const updateRunner = (updates: Partial<RunnerState>) => {
  useSkillPlannerStore.setState((prev) => {
    return {
      runner: { ...prev.runner, ...updates },
    };
  });
};

export const hasCandidate = (skillId: string) => {
  const { candidates } = useSkillPlannerStore.getState();
  return candidates[skillId] !== undefined;
};

type CreateCandidateParams = {
  skillId: string;
  hintLevel?: number;
};

export const createCandidate = (params: CreateCandidateParams): CandidateSkill => {
  const { skillId, hintLevel = 0 } = params;

  const skill = getSkillById(skillId);

  // Get skill data for rarity check
  const skills = GametoraSkills as Array<ISkill>;
  const skillData = skills.find((s) => s.id === parseInt(skillId, 10));
  const isGold = skillData?.rarity === 2;

  // Check stackable status
  const isStackable = isStackableSkill(skillId);

  // Determine tier level for stackable skills
  let tierLevel: 1 | 2 | undefined = undefined;
  let nextTierId: string | undefined = undefined;
  let previousTierId: string | undefined = undefined;

  if (isStackable) {
    const baseTier = getBaseTier(skillId);
    const upgradeTier = getUpgradeTier(baseTier);

    if (skillId === baseTier) {
      // This is the base tier
      tierLevel = 1;
      nextTierId = upgradeTier;
    } else if (skillId === upgradeTier) {
      // This is the upgrade tier
      tierLevel = 2;
      previousTierId = baseTier;
    }
  }

  // Get gold/white relationships
  const goldSkillId = isGold ? undefined : getGoldVersion(skillId);
  const whiteSkillId = isGold ? getWhiteVersion(skillId) : undefined;
  const baseTierIdForGold = isGold ? getBaseTier(whiteSkillId ?? skillId) : undefined;

  return {
    skillId,
    cost: skill.baseCost,
    netCost: skill.baseCost,
    hintLevel: hintLevel as CandidateSkill['hintLevel'],

    // Stackable support
    isStackable,
    tierLevel,
    nextTierId,
    previousTierId,

    // Gold/White relationship
    isGold,
    whiteSkillId,
    goldSkillId,
    baseTierIdForGold,
  };
};

export const setCandidates = (candidates: Record<string, CandidateSkill>) => {
  useSkillPlannerStore.setState({ candidates });
};

/**
 * Checks if a skill can be added to the candidate pool.
 * For upgrade tiers (◎), requires base tier (○) to be in pool.
 * @returns { canAdd: boolean, reason?: string }
 */
export const canAddToPool = (skillId: string): { canAdd: boolean; reason?: string } => {
  // If already in pool, can't add again
  if (hasCandidate(skillId)) {
    return { canAdd: false, reason: 'Already in candidate pool' };
  }

  // Check if this is a stackable skill
  const baseTier = getBaseTier(skillId);
  const upgradeTier = getUpgradeTier(baseTier);

  // If this skill has an upgrade tier, it means it's part of a stackable family
  if (upgradeTier) {
    // If the skillId matches the upgrade tier, check if base is in pool
    if (skillId === upgradeTier) {
      if (!hasCandidate(baseTier)) {
        return {
          canAdd: false,
          reason: 'Base tier (○) must be added to pool before upgrade tier (◎)',
        };
      }
    }
  }

  return { canAdd: true };
};

/**
 * Returns upgrade tiers (◎) that are now unlocked based on current pool.
 * Upgrade tiers become addable when their base tier (○) is in the pool.
 */
export const getAddableUpgrades = (): Array<string> => {
  const { candidates } = useSkillPlannerStore.getState();
  const addableUpgrades: Array<string> = [];

  // Check each candidate to see if it's a stackable base tier
  for (const candidate of Object.values(candidates)) {
    if (candidate.isStackable && candidate.tierLevel === 1 && candidate.nextTierId) {
      // This is a base tier with an upgrade tier available
      // If upgrade tier is not already in pool, it's now addable
      if (!hasCandidate(candidate.nextTierId)) {
        addableUpgrades.push(candidate.nextTierId);
      }
    }
  }

  return addableUpgrades;
};

/**
 * Adds a skill to the candidate pool with tier unlock logic.
 * - Gold skills auto-add BOTH white tiers (○ and ◎) if not already in pool
 * - This mirrors the game requirement: must own both white tiers before buying gold
 */
export const addCandidate = (skillId: string, hintLevel: number = 0) => {
  if (hasCandidate(skillId)) {
    return;
  }

  const candidate: CandidateSkill = createCandidate({ skillId, hintLevel });

  // Gold skill auto-add logic: add BOTH white tiers (○ and ◎)
  if (candidate.isGold && candidate.whiteSkillId) {
    const whiteTiersToAdd: Array<string> = [];

    // Get base tier (○)
    const baseTier = getBaseTier(candidate.whiteSkillId);
    if (baseTier && !hasCandidate(baseTier)) {
      whiteTiersToAdd.push(baseTier);
    }

    // Get upgrade tier (◎) if it exists
    const upgradeTier = getUpgradeTier(baseTier || candidate.whiteSkillId);
    if (upgradeTier && !hasCandidate(upgradeTier)) {
      whiteTiersToAdd.push(upgradeTier);
    }

    // Add all missing white tiers + gold
    if (whiteTiersToAdd.length > 0) {
      const newCandidates: Record<string, CandidateSkill> = {};

      for (const tierId of whiteTiersToAdd) {
        newCandidates[tierId] = createCandidate({ skillId: tierId, hintLevel });
      }
      newCandidates[skillId] = candidate;

      useSkillPlannerStore.setState((state) => ({
        candidates: {
          ...state.candidates,
          ...newCandidates,
        },
      }));
      return;
    }
  }

  // Standard add (no gold auto-add needed)
  useSkillPlannerStore.setState((state) => {
    return {
      candidates: {
        ...state.candidates,
        [skillId]: candidate,
      },
    };
  });
};

/**
 * Removes a skill from the candidate pool with tier unlock logic.
 * - Removing white base tier (○) also removes upgrade tier (◎) if present
 * - Removing gold keeps white in pool (user might want white-only)
 * - Removing white does NOT affect gold (but gold cost becomes bundled)
 */
export const removeCandidate = (skillId: string) => {
  useSkillPlannerStore.setState((prev) => {
    const newCandidates = { ...prev.candidates };
    const candidateToRemove = newCandidates[skillId];

    if (!candidateToRemove) {
      return prev;
    }

    // Remove the primary skill
    delete newCandidates[skillId];

    // Start building the new runner
    const runner = { ...prev.runner };
    runner.skills = runner.skills.filter((id) => id !== skillId);

    // If removing a stackable base tier, also remove upgrade tier if present
    if (
      candidateToRemove.isStackable &&
      candidateToRemove.tierLevel === 1 &&
      candidateToRemove.nextTierId
    ) {
      const upgradeTierId = candidateToRemove.nextTierId;
      if (newCandidates[upgradeTierId]) {
        delete newCandidates[upgradeTierId];

        // Also remove upgrade from runner if it was there
        runner.skills = runner.skills.filter((id) => id !== upgradeTierId);
      }
    }

    return { candidates: newCandidates, runner: runner };
  });
};

export const getCandidate = (skillId: string) => {
  const { candidates } = useSkillPlannerStore.getState();

  return candidates[skillId];
};

export const addObtainedSkill = (skillId: string) => {
  useSkillPlannerStore.setState((state) => {
    if (state.obtainedSkills.includes(skillId)) {
      return state;
    }

    return {
      obtainedSkills: [...state.obtainedSkills, skillId],
    };
  });
};

export const removeObtainedSkill = (skillId: string) => {
  useSkillPlannerStore.setState((state) => {
    return {
      obtainedSkills: state.obtainedSkills.filter((id) => id !== skillId),
    };
  });
};

export const setObtainedSkills = (skillIds: Array<string>) => {
  useSkillPlannerStore.setState({ obtainedSkills: skillIds });
};

export const hasObtainedSkill = (skillId: string) => {
  const { obtainedSkills } = useSkillPlannerStore.getState();
  return obtainedSkills.includes(skillId);
};

export const setCandidateHintLevel = (skillId: string, hintLevel: number) => {
  useSkillPlannerStore.setState((state) => {
    const candidate = cloneDeep(state.candidates[skillId]);
    candidate.hintLevel = hintLevel as CandidateSkill['hintLevel'];

    return {
      candidates: {
        ...state.candidates,
        [skillId]: candidate,
      },
    };
  });
};

export const updateCandidate = (skillId: string, updates: Partial<CandidateSkill>) => {
  useSkillPlannerStore.setState((state) => {
    const candidate = { ...state.candidates[skillId], ...updates };

    return {
      candidates: {
        ...state.candidates,
        [skillId]: candidate,
      },
    };
  });
};

export const setBudget = (budget: number) => {
  useSkillPlannerStore.setState({ budget: Math.max(0, budget) });
};

export const setHasFastLearner = (hasFastLearner: boolean) => {
  useSkillPlannerStore.setState({
    hasFastLearner,
  });
};

export const setSeed = (seed: number | null) => {
  useSkillPlannerStore.setState({ seed });
};

export const createNewSeed = () => {
  const seed = generateSeed();
  useSkillPlannerStore.setState({ seed });
  return seed;
};

export const setIsOptimizing = (isOptimizing: boolean) => {
  useSkillPlannerStore.setState((prev) => {
    return {
      isOptimizing,
      progress: isOptimizing ? prev.progress : null,
    };
  });
};

export const setProgress = (progress: OptimizationProgress | null) => {
  useSkillPlannerStore.setState({ progress });
};

export const setResult = (result: OptimizationResult | null) => {
  useSkillPlannerStore.setState({ result });
};

export const resetRunner = () => {
  useSkillPlannerStore.setState({
    runner: createRunnerState(),
    candidates: {},
    obtainedSkills: [],
  });
};

export const clearAll = () => {
  useSkillPlannerStore.setState({
    candidates: {},
    obtainedSkills: [],
    result: null,
    progress: null,
    isOptimizing: false,
  });
};

export const clearCandidates = () => {
  const { runner, candidates, obtainedSkills } = useSkillPlannerStore.getState();

  // If runner has an outfit, preserve the unique skill
  if (runner.outfitId) {
    const uniqueSkill = getUniqueSkillForByUmaId(runner.outfitId);
    const uniqueCandidate = candidates[uniqueSkill];

    // Preserve unique skill in candidates and obtainedSkills
    if (uniqueCandidate) {
      useSkillPlannerStore.setState({
        candidates: { [uniqueSkill]: uniqueCandidate },
        obtainedSkills: obtainedSkills.includes(uniqueSkill)
          ? obtainedSkills
          : [...obtainedSkills, uniqueSkill],
        skillDrawerOpen: false,
      });
      return;
    }
  }

  // No outfit or unique skill not found, clear everything
  useSkillPlannerStore.setState({
    candidates: {},
    obtainedSkills: [],
    skillDrawerOpen: false,
  });
};

export const clearResult = () => {
  useSkillPlannerStore.setState({ result: null });
};
