import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateSeed } from '@/utils/crypto';
import { createRunnerState } from '../runners/components/runner-card/types';
import type { RunnerState } from '../runners/components/runner-card/types';
import type { CandidateSkill, HintLevel, OptimizationProgress, OptimizationResult, SkillPlanningMeta } from './types';
import {
  getBaseTier,
  getGoldVersion,
  getUpgradeTier,
  getWhiteVersion,
  isStackableSkill,
} from '@/modules/skills/skill-relationships';
import { getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { findVersionOfSkill, skillCollection } from '@/modules/data/skills';
import { getRelatedSkillIds, getRepresentativePrerequisiteIds } from './skill-family';
import { resolveActiveSkills } from './optimizer';

interface SkillPlannerState {
  runner: RunnerState;
  // Candidate skills
  candidates: Record<string, CandidateSkill>;
  // Hint/bought metadata for both visible candidates and hidden prerequisites
  skillMetaById: Record<string, SkillPlanningMeta>;

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
      skillMetaById: {},
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
        skillMetaById: state.skillMetaById,
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

const DEFAULT_SKILL_META: SkillPlanningMeta = {
  hintLevel: 0,
};

const normalizeSkillMeta = (meta: SkillPlanningMeta): SkillPlanningMeta | undefined => {
  const next: SkillPlanningMeta = {
    hintLevel: meta.hintLevel,
    bought: meta.bought || undefined,
  };

  if (next.hintLevel === 0 && !next.bought) {
    return undefined;
  }

  return next;
};

const resolveSkillMeta = (
  skillMetaById: Record<string, SkillPlanningMeta>,
  skillId: string,
): SkillPlanningMeta => {
  return skillMetaById[skillId] ?? DEFAULT_SKILL_META;
};

const buildSkillMetaWithoutIds = (
  skillMetaById: Record<string, SkillPlanningMeta>,
  skillIds: Array<string>,
): Record<string, SkillPlanningMeta> => {
  const next = { ...skillMetaById };
  for (const skillId of skillIds) {
    delete next[skillId];
  }
  return next;
};

type CreateCandidateParams = {
  skillId: string;
  hintLevel?: number;
};

export const createCandidate = (params: CreateCandidateParams): CandidateSkill => {
  const { skillId, hintLevel = 0 } = params;

  const skill = skillCollection[skillId];

  // Get skill data for rarity check
  const isGold = skill.rarity === 2;

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
 * Higher tiers can only be added when their prerequisites are either visible candidates
 * or already marked bought in planner skill metadata.
 * @returns { canAdd: boolean, reason?: string }
 */
export const canAddToPool = (skillId: string): { canAdd: boolean; reason?: string } => {
  const { candidates, skillMetaById } = useSkillPlannerStore.getState();

  // If already in pool, can't add again
  if (hasCandidate(skillId)) {
    return { canAdd: false, reason: 'Already in candidate pool' };
  }

  const prereqIds = getRepresentativePrerequisiteIds(skillId);
  if (prereqIds.length === 0) {
    return { canAdd: true };
  }

  for (const prereqId of prereqIds) {
    const prereqMeta = resolveSkillMeta(skillMetaById, prereqId);
    if (!candidates[prereqId] && !prereqMeta.bought) {
      if (prereqIds.length === 1) {
        return {
          canAdd: false,
          reason: 'Base tier (○) must be added to pool or marked bought before upgrade tier (◎)',
        };
      }

      return {
        canAdd: false,
        reason: 'Base and upgrade tiers must be in the pool or marked bought before gold',
      };
    }
  }

  return { canAdd: true };
};

/**
 * Returns upgrade tiers (◎) that are now unlocked.
 * A bought base tier also unlocks its upgrade tier.
 */
export const getAddableUpgrades = (): Array<string> => {
  const { candidates, skillMetaById } = useSkillPlannerStore.getState();
  const addableUpgrades: Array<string> = [];

  // Check each candidate to see if it's a stackable base tier
  for (const candidate of Object.values(candidates)) {
    if (candidate.isStackable && candidate.tierLevel === 1 && candidate.nextTierId) {
      // This is a base tier with an upgrade tier available
      // If upgrade tier is not already in pool, it's now addable
      if (!hasCandidate(candidate.nextTierId) && !resolveSkillMeta(skillMetaById, candidate.nextTierId).bought) {
        addableUpgrades.push(candidate.nextTierId);
      }
    }
  }

  return addableUpgrades;
};

/**
 * Adds a user-selected representative skill to the candidate pool.
 * Prerequisites stay hidden and are derived later for cost display / optimization.
 */
export const addCandidate = (skillId: string, hintLevel?: number) => {
  // If the skill is already in the candidate pool, do nothing
  if (hasCandidate(skillId)) {
    return;
  }

  const candidates = useSkillPlannerStore.getState().candidates;

  // If instead they choose any of the other versions, replace it with that one
  const otherVersion = findVersionOfSkill(skillId, Object.keys(candidates));

  if (otherVersion) {
    const otherSkill = skillCollection[otherVersion];
    const thisSkill = skillCollection[skillId];
    if (!confirm(`This will replace "${otherSkill.name}" with "${thisSkill.name}", continue?`)) {
      // Cancel the operation
      return;
    }
  }

  const { skillMetaById } = useSkillPlannerStore.getState();
  const effectiveHintLevel = hintLevel ?? resolveSkillMeta(skillMetaById, skillId).hintLevel;
  const candidate: CandidateSkill = createCandidate({ skillId, hintLevel: effectiveHintLevel });

  useSkillPlannerStore.setState((state) => {
    const newCandidates = { ...state.candidates };
    let nextSkillMetaById = state.skillMetaById;

    if (otherVersion) {
      const relatedSkillIds = getRelatedSkillIds(otherVersion);
      for (const relatedSkillId of relatedSkillIds) {
        delete newCandidates[relatedSkillId];
      }
      nextSkillMetaById = buildSkillMetaWithoutIds(state.skillMetaById, relatedSkillIds);
    }

    newCandidates[skillId] = candidate;

    return {
      candidates: newCandidates,
      skillMetaById: nextSkillMetaById,
    };
  });
};

/**
 * Removes the visible representative and clears all related planner metadata for its family.
 */
export const removeCandidate = (skillId: string) => {
  useSkillPlannerStore.setState((prev) => {
    if (!prev.candidates[skillId]) {
      return prev;
    }

    const relatedSkillIds = getRelatedSkillIds(skillId);
    const newCandidates = { ...prev.candidates };
    for (const relatedSkillId of relatedSkillIds) {
      delete newCandidates[relatedSkillId];
    }

    return {
      candidates: newCandidates,
      skillMetaById: buildSkillMetaWithoutIds(prev.skillMetaById, relatedSkillIds),
      runner: {
        ...prev.runner,
        skills: prev.runner.skills.filter((id) => !relatedSkillIds.includes(id)),
      },
    };
  });
};

export const getCandidate = (skillId: string) => {
  const { candidates } = useSkillPlannerStore.getState();

  return candidates[skillId];
};

export const setSkillBought = (skillId: string, bought: boolean) => {
  useSkillPlannerStore.setState((state) => {
    const nextSkillMetaById = { ...state.skillMetaById };

    const applyBoughtState = (targetSkillId: string, isBought: boolean) => {
      const normalized = normalizeSkillMeta({
        ...resolveSkillMeta(nextSkillMetaById, targetSkillId),
        bought: isBought,
      });

      if (!normalized) {
        delete nextSkillMetaById[targetSkillId];
        return;
      }

      nextSkillMetaById[targetSkillId] = normalized;
    };

    applyBoughtState(skillId, bought);

    const baseTierId = getBaseTier(skillId);
    const upgradeTierId = getUpgradeTier(baseTierId);
    if (upgradeTierId && skillId === upgradeTierId && baseTierId) {
      // Owning ◎ always implies already owning ○.
      if (bought) {
        applyBoughtState(baseTierId, true);
      }
    }

    if (upgradeTierId && skillId === baseTierId && !bought) {
      // Prevent impossible state: ○ cannot be unbought while ◎ remains bought.
      applyBoughtState(upgradeTierId, false);
    }

    return {
      skillMetaById: nextSkillMetaById,
    };
  });
};

export const addObtainedSkill = (skillId: string) => {
  setSkillBought(skillId, true);
};

export const removeObtainedSkill = (skillId: string) => {
  setSkillBought(skillId, false);
};

export const setObtainedSkills = (skillIds: Array<string>) => {
  useSkillPlannerStore.setState((state) => {
    const nextSkillMetaById = { ...state.skillMetaById };

    for (const [skillId, meta] of Object.entries(nextSkillMetaById)) {
      const normalized = normalizeSkillMeta({ ...meta, bought: skillIds.includes(skillId) || undefined });
      if (!normalized) {
        delete nextSkillMetaById[skillId];
      } else {
        nextSkillMetaById[skillId] = normalized;
      }
    }

    for (const skillId of skillIds) {
      nextSkillMetaById[skillId] = normalizeSkillMeta({
        ...resolveSkillMeta(nextSkillMetaById, skillId),
        bought: true,
      })!;
    }

    return { skillMetaById: nextSkillMetaById };
  });
};

export const hasObtainedSkill = (skillId: string) => {
  const { skillMetaById } = useSkillPlannerStore.getState();
  return resolveSkillMeta(skillMetaById, skillId).bought === true;
};

export const getSkillPlanningMeta = (skillId: string): SkillPlanningMeta => {
  const { skillMetaById } = useSkillPlannerStore.getState();
  return resolveSkillMeta(skillMetaById, skillId);
};

export const getObtainedSkills = (): Array<string> => {
  const { skillMetaById } = useSkillPlannerStore.getState();

  return resolveActiveSkills(
    Object.entries(skillMetaById)
      .filter(([, meta]) => meta.bought)
      .map(([skillId]) => skillId),
  );
};

export const setCandidateHintLevel = (skillId: string, hintLevel: number) => {
  useSkillPlannerStore.setState((state) => {
    const currentCandidate = state.candidates[skillId];
    const normalizedMeta = normalizeSkillMeta({
      ...resolveSkillMeta(state.skillMetaById, skillId),
      hintLevel: hintLevel as HintLevel,
    });

    const nextSkillMetaById = normalizedMeta
      ? {
          ...state.skillMetaById,
          [skillId]: normalizedMeta,
        }
      : buildSkillMetaWithoutIds(state.skillMetaById, [skillId]);

    return {
      skillMetaById: nextSkillMetaById,
      ...(currentCandidate
        ? {
            candidates: {
              ...state.candidates,
              [skillId]: {
                ...currentCandidate,
                hintLevel: hintLevel as HintLevel,
              },
            },
          }
        : {}),
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
    skillMetaById: {},
  });
};

export const clearAll = () => {
  useSkillPlannerStore.setState({
    candidates: {},
    skillMetaById: {},
    result: null,
    progress: null,
    isOptimizing: false,
  });
};

export const clearCandidates = () => {
  const { runner, candidates, skillMetaById } = useSkillPlannerStore.getState();

  // If runner has an outfit, preserve the unique skill
  if (runner.outfitId) {
    const uniqueSkill = getUniqueSkillForByUmaId(runner.outfitId);
    const uniqueCandidate = candidates[uniqueSkill];

    // Preserve unique skill in candidates and mark it as bought for baseline comparisons.
    if (uniqueCandidate) {
      useSkillPlannerStore.setState({
        candidates: { [uniqueSkill]: uniqueCandidate },
        skillMetaById: {
          [uniqueSkill]: normalizeSkillMeta({
            ...resolveSkillMeta(skillMetaById, uniqueSkill),
            bought: true,
          })!,
        },
        skillDrawerOpen: false,
      });
      return;
    }
  }

  // No outfit or unique skill not found, clear everything
  useSkillPlannerStore.setState({
    candidates: {},
    skillMetaById: {},
    skillDrawerOpen: false,
  });
};

export const clearResult = () => {
  useSkillPlannerStore.setState({ result: null });
};
