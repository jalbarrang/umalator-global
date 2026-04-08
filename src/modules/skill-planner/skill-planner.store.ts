import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { generateSeed } from '@/utils/crypto';
import { createRunnerState } from '../runners/components/runner-card/types';
import type { RunnerState } from '../runners/components/runner-card/types';
import type {
  CandidateSkill,
  HintLevel,
  OptimizationProgress,
  OptimizationResult,
  SkillPlanningMeta,
  WizardStep,
} from './types';
import {
  getBaseTier,
  getGoldVersion,
  getUpgradeTier,
  getWhiteVersion,
  isStackableSkill,
} from '@/modules/skills/skill-relationships';
import { getSelectableSkillsForUma, getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { findVersionOfSkill, skillCollection } from '@/modules/data/skills';
import { getRelatedSkillIds, isSkillCoveredByOwnedFamily } from './skill-family';
import { resolveActiveSkills } from './optimizer';

const DEFAULT_BUDGET = 1000;
export const skillPlannerSteps: Array<WizardStep> = ['runner', 'shop', 'review'];

interface SkillPlannerState {
  hasActiveSession: boolean;
  currentStep: WizardStep;
  completedSteps: Array<WizardStep>;

  runner: RunnerState;
  obtainedSkillIds: Array<string>;
  candidates: Record<string, CandidateSkill>;
  skillMetaById: Record<string, SkillPlanningMeta>;

  budget: number;
  hasFastLearner: boolean;
  ignoreStaminaConsumption: boolean;

  seed: number | null;
  isOptimizing: boolean;
  progress: OptimizationProgress | null;
  result: OptimizationResult | null;
  lastOptimizationFingerprint: string | null;
}

type PlannerPersistedState = Pick<
  SkillPlannerState,
  | 'hasActiveSession'
  | 'currentStep'
  | 'completedSteps'
  | 'runner'
  | 'obtainedSkillIds'
  | 'candidates'
  | 'skillMetaById'
  | 'budget'
  | 'hasFastLearner'
  | 'ignoreStaminaConsumption'
  | 'seed'
>;

const createInitialState = (): SkillPlannerState => ({
  hasActiveSession: false,
  currentStep: 'runner',
  completedSteps: [],
  runner: createRunnerState(),
  obtainedSkillIds: [],
  candidates: {},
  skillMetaById: {},
  budget: DEFAULT_BUDGET,
  hasFastLearner: false,
  ignoreStaminaConsumption: false,
  seed: null,
  isOptimizing: false,
  progress: null,
  result: null,
  lastOptimizationFingerprint: null,
});

const toPersistedState = (state: SkillPlannerState): PlannerPersistedState => ({
  hasActiveSession: state.hasActiveSession,
  currentStep: state.currentStep,
  completedSteps: state.completedSteps,
  runner: state.runner,
  obtainedSkillIds: state.obtainedSkillIds,
  candidates: state.candidates,
  skillMetaById: state.skillMetaById,
  budget: state.budget,
  hasFastLearner: state.hasFastLearner,
  ignoreStaminaConsumption: state.ignoreStaminaConsumption,
  seed: state.seed,
});

export const useSkillPlannerStore = create<SkillPlannerState>()(
  persist(() => createInitialState(), {
    name: 'umalator-skill-planner-v2',
    storage: createJSONStorage(() => localStorage),
    partialize: toPersistedState,
  }),
);

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

  const isGold = skill.rarity === 2;
  const isStackable = isStackableSkill(skillId);

  let tierLevel: 1 | 2 | undefined = undefined;
  let nextTierId: string | undefined = undefined;
  let previousTierId: string | undefined = undefined;

  if (isStackable) {
    const baseTier = getBaseTier(skillId);
    const upgradeTier = getUpgradeTier(baseTier);

    if (skillId === baseTier) {
      tierLevel = 1;
      nextTierId = upgradeTier;
    } else if (skillId === upgradeTier) {
      tierLevel = 2;
      previousTierId = baseTier;
    }
  }

  const goldSkillId = isGold ? undefined : getGoldVersion(skillId);
  const whiteSkillId = isGold ? getWhiteVersion(skillId) : undefined;
  const baseTierIdForGold = isGold ? getBaseTier(whiteSkillId ?? skillId) : undefined;

  return {
    skillId,
    cost: skill.baseCost,
    netCost: skill.baseCost,
    hintLevel: hintLevel as CandidateSkill['hintLevel'],
    isStackable,
    tierLevel,
    nextTierId,
    previousTierId,
    isGold,
    whiteSkillId,
    goldSkillId,
    baseTierIdForGold,
  };
};

const isSelectableForRunner = (skillId: string, outfitId: string) => {
  if (!outfitId) {
    return false;
  }

  return getSelectableSkillsForUma(outfitId).includes(skillId);
};

const getUniqueSkillId = (outfitId: string) => {
  if (!outfitId) {
    return undefined;
  }

  return getUniqueSkillForByUmaId(outfitId);
};

const syncRunnerSkills = (runner: RunnerState, obtainedSkillIds: Array<string>): RunnerState => ({
  ...runner,
  skills: obtainedSkillIds,
});

const resolveObtainedSkillIds = (
  skillIds: Iterable<string>,
  outfitId: string,
  previousOutfitId?: string,
): Array<string> => {
  const nextSkillIds = Array.from(skillIds).filter((skillId) => !!skillCollection[skillId]);
  const nextUniqueSkillId = getUniqueSkillId(outfitId);
  const previousUniqueSkillId = getUniqueSkillId(previousOutfitId ?? '');

  const filtered = previousUniqueSkillId
    ? nextSkillIds.filter((skillId) => skillId !== previousUniqueSkillId)
    : nextSkillIds;

  if (nextUniqueSkillId && !filtered.includes(nextUniqueSkillId)) {
    filtered.unshift(nextUniqueSkillId);
  }

  return resolveActiveSkills(filtered);
};

const pruneCandidates = (
  candidates: Record<string, CandidateSkill>,
  skillMetaById: Record<string, SkillPlanningMeta>,
  obtainedSkillIds: Array<string>,
  outfitId: string,
) => {
  if (!outfitId) {
    return {
      candidates: {},
      skillMetaById: {},
    };
  }

  const nextCandidates: Record<string, CandidateSkill> = {};
  let nextSkillMetaById = { ...skillMetaById };

  for (const candidate of Object.values(candidates)) {
    if (!isSelectableForRunner(candidate.skillId, outfitId)) {
      nextSkillMetaById = buildSkillMetaWithoutIds(
        nextSkillMetaById,
        getRelatedSkillIds(candidate.skillId),
      );
      continue;
    }

    // Only prune if the exact skill is obtained — gold skills should stay
    // even if their white family tiers are obtained (those are prerequisites,
    // not equivalents).
    if (obtainedSkillIds.includes(candidate.skillId)) {
      nextSkillMetaById = buildSkillMetaWithoutIds(
        nextSkillMetaById,
        getRelatedSkillIds(candidate.skillId),
      );
      continue;
    }

    nextCandidates[candidate.skillId] = {
      ...candidate,
      hintLevel: resolveSkillMeta(nextSkillMetaById, candidate.skillId).hintLevel,
    };
  }

  return {
    candidates: nextCandidates,
    skillMetaById: nextSkillMetaById,
  };
};

const buildImportedRunnerState = (runnerSnapshot: RunnerState): RunnerState => {
  return createRunnerState({
    ...runnerSnapshot,
    skills: [],
  });
};

const applyBaselineRunner = (
  state: SkillPlannerState,
  runnerSnapshot: RunnerState,
  obtainedSkillIds: Array<string>,
) => {
  const nextRunner = syncRunnerSkills(buildImportedRunnerState(runnerSnapshot), obtainedSkillIds);
  const pruned = pruneCandidates(
    state.candidates,
    state.skillMetaById,
    obtainedSkillIds,
    nextRunner.outfitId,
  );

  return {
    runner: nextRunner,
    obtainedSkillIds,
    candidates: pruned.candidates,
    skillMetaById: pruned.skillMetaById,
    hasActiveSession: true,
    currentStep: 'runner' as const,
    isOptimizing: false,
    progress: null,
  };
};

export const setCurrentStep = (step: WizardStep) => {
  useSkillPlannerStore.setState((state) => ({
    hasActiveSession: true,
    currentStep: step,
    completedSteps: state.completedSteps,
  }));
};

export const completeCurrentStep = () => {
  useSkillPlannerStore.setState((state) => {
    if (state.completedSteps.includes(state.currentStep)) {
      return state;
    }

    return {
      completedSteps: [...state.completedSteps, state.currentStep],
    };
  });
};

export const startFreshSession = () => {
  useSkillPlannerStore.setState({
    ...createInitialState(),
    hasActiveSession: true,
    currentStep: 'runner',
  });
};

export const startOver = () => {
  useSkillPlannerStore.setState(createInitialState());
};

export const isStepUnlocked = (step: WizardStep) => {
  const { currentStep, completedSteps } = useSkillPlannerStore.getState();

  if (step === 'runner') {
    return true;
  }

  if (step === 'shop') {
    return completedSteps.includes('runner') || currentStep === 'shop' || currentStep === 'review';
  }

  return completedSteps.includes('shop') || currentStep === 'review';
};

export const updateRunner = (updates: Partial<RunnerState>) => {
  useSkillPlannerStore.setState((state) => {
    const previousRunner = state.runner;
    const nextRunner = { ...previousRunner, ...updates };
    const nextObtainedSkillIds =
      updates.outfitId !== undefined
        ? resolveObtainedSkillIds(
            state.obtainedSkillIds,
            nextRunner.outfitId,
            previousRunner.outfitId,
          )
        : resolveObtainedSkillIds(state.obtainedSkillIds, nextRunner.outfitId);

    const pruned = pruneCandidates(
      state.candidates,
      state.skillMetaById,
      nextObtainedSkillIds,
      nextRunner.outfitId,
    );

    return {
      runner: syncRunnerSkills(nextRunner, nextObtainedSkillIds),
      obtainedSkillIds: nextObtainedSkillIds,
      candidates: pruned.candidates,
      skillMetaById: pruned.skillMetaById,
      hasActiveSession: true,
      isOptimizing: false,
      progress: null,
    };
  });
};

export const setObtainedSkills = (skillIds: Array<string>) => {
  useSkillPlannerStore.setState((state) => {
    const nextObtainedSkillIds = resolveObtainedSkillIds(skillIds, state.runner.outfitId);
    const pruned = pruneCandidates(
      state.candidates,
      state.skillMetaById,
      nextObtainedSkillIds,
      state.runner.outfitId,
    );

    return {
      runner: syncRunnerSkills(state.runner, nextObtainedSkillIds),
      obtainedSkillIds: nextObtainedSkillIds,
      candidates: pruned.candidates,
      skillMetaById: pruned.skillMetaById,
      hasActiveSession: true,
      isOptimizing: false,
      progress: null,
    };
  });
};

export const addObtainedSkill = (skillId: string) => {
  const { obtainedSkillIds } = useSkillPlannerStore.getState();
  setObtainedSkills([...obtainedSkillIds, skillId]);
};

export const removeObtainedSkill = (skillId: string) => {
  const { obtainedSkillIds, runner } = useSkillPlannerStore.getState();
  const lockedUniqueSkillId = getUniqueSkillId(runner.outfitId);

  if (lockedUniqueSkillId === skillId) {
    return;
  }

  setObtainedSkills(obtainedSkillIds.filter((id) => id !== skillId));
};

export const getObtainedSkills = (): Array<string> => {
  return useSkillPlannerStore.getState().obtainedSkillIds;
};

export const hasObtainedSkill = (skillId: string) => {
  return isSkillCoveredByOwnedFamily(skillId, useSkillPlannerStore.getState().obtainedSkillIds);
};

export const hasCandidate = (skillId: string) => {
  return useSkillPlannerStore.getState().candidates[skillId] !== undefined;
};

export const canAddToPool = (skillId: string): { canAdd: boolean; reason?: string } => {
  const { candidates, obtainedSkillIds, runner } = useSkillPlannerStore.getState();

  if (!runner.outfitId) {
    return { canAdd: false, reason: 'Select a runner first' };
  }

  if (!isSelectableForRunner(skillId, runner.outfitId)) {
    return { canAdd: false, reason: 'Not valid for the current runner' };
  }

  if (hasCandidate(skillId)) {
    return { canAdd: false, reason: 'Already in candidate pool' };
  }

  if (isSkillCoveredByOwnedFamily(skillId, obtainedSkillIds)) {
    return { canAdd: false, reason: 'Already obtained' };
  }

  // Gold and upgrade tier (◎) skills can always be added as candidates.
  // Their white prerequisites are expanded automatically during optimization
  // if not already obtained — no need to gate the user here.
  return { canAdd: true };
};

export const addCandidate = (skillId: string, hintLevel?: number) => {
  const canAdd = canAddToPool(skillId);
  if (!canAdd.canAdd) {
    return;
  }

  useSkillPlannerStore.setState((state) => {
    const effectiveHintLevel =
      hintLevel ?? resolveSkillMeta(state.skillMetaById, skillId).hintLevel;
    const candidate = createCandidate({ skillId, hintLevel: effectiveHintLevel });
    const nextCandidates = { ...state.candidates };
    let nextSkillMetaById = state.skillMetaById;

    const otherVersion = findVersionOfSkill(skillId, Object.keys(nextCandidates));
    if (otherVersion) {
      const relatedSkillIds = getRelatedSkillIds(otherVersion);
      for (const relatedSkillId of relatedSkillIds) {
        delete nextCandidates[relatedSkillId];
      }
      nextSkillMetaById = buildSkillMetaWithoutIds(state.skillMetaById, relatedSkillIds);
    }

    nextCandidates[skillId] = candidate;
    const normalizedMeta = normalizeSkillMeta({
      ...resolveSkillMeta(nextSkillMetaById, skillId),
      hintLevel: effectiveHintLevel as HintLevel,
    });

    if (normalizedMeta) {
      nextSkillMetaById = {
        ...nextSkillMetaById,
        [skillId]: normalizedMeta,
      };
    }

    return {
      candidates: nextCandidates,
      skillMetaById: nextSkillMetaById,
      hasActiveSession: true,
      isOptimizing: false,
      progress: null,
    };
  });
};

export const removeCandidate = (skillId: string) => {
  useSkillPlannerStore.setState((state) => {
    if (!state.candidates[skillId]) {
      return state;
    }

    const relatedSkillIds = getRelatedSkillIds(skillId);
    const nextCandidates = { ...state.candidates };

    for (const relatedSkillId of relatedSkillIds) {
      delete nextCandidates[relatedSkillId];
    }

    return {
      candidates: nextCandidates,
      skillMetaById: buildSkillMetaWithoutIds(state.skillMetaById, relatedSkillIds),
      hasActiveSession: true,
      isOptimizing: false,
      progress: null,
    };
  });
};

export const clearCandidates = () => {
  useSkillPlannerStore.setState({
    candidates: {},
    skillMetaById: {},
    isOptimizing: false,
    progress: null,
  });
};

export const setCandidateHintLevel = (skillId: string, hintLevel: number) => {
  useSkillPlannerStore.setState((state) => {
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

    // Update the candidate entry too if the skill is a direct candidate
    const currentCandidate = state.candidates[skillId];
    const nextCandidates = currentCandidate
      ? {
          ...state.candidates,
          [skillId]: {
            ...currentCandidate,
            hintLevel: hintLevel as HintLevel,
          },
        }
      : state.candidates;

    return {
      candidates: nextCandidates,
      skillMetaById: nextSkillMetaById,
      hasActiveSession: true,
      isOptimizing: false,
      progress: null,
    };
  });
};

export const getSkillPlanningMeta = (skillId: string): SkillPlanningMeta => {
  const state = useSkillPlannerStore.getState();
  const candidateMeta = resolveSkillMeta(state.skillMetaById, skillId);
  return {
    hintLevel: candidateMeta.hintLevel,
    bought: isSkillCoveredByOwnedFamily(skillId, state.obtainedSkillIds),
  };
};

export const importVeteranRunner = (runnerSnapshot: RunnerState, resetSession = false) => {
  useSkillPlannerStore.setState((state) => {
    const baseState = resetSession ? createInitialState() : state;
    const nextObtainedSkillIds = resolveObtainedSkillIds(
      runnerSnapshot.skills,
      runnerSnapshot.outfitId,
      resetSession ? undefined : state.runner.outfitId,
    );

    return {
      ...baseState,
      ...applyBaselineRunner(baseState, runnerSnapshot, nextObtainedSkillIds),
    };
  });
};

export const importRunnerBaseline = (runnerSnapshot: RunnerState, resetSession = false) => {
  importVeteranRunner(runnerSnapshot, resetSession);
};

export const resetRunner = () => {
  useSkillPlannerStore.setState((state) => {
    const nextRunner = createRunnerState();
    const nextObtainedSkillIds = resolveObtainedSkillIds([], nextRunner.outfitId);

    return {
      ...state,
      runner: syncRunnerSkills(nextRunner, nextObtainedSkillIds),
      obtainedSkillIds: nextObtainedSkillIds,
      candidates: {},
      skillMetaById: {},
      isOptimizing: false,
      progress: null,
    };
  });
};

export const setBudget = (budget: number) => {
  useSkillPlannerStore.setState({ budget: Math.max(0, budget) });
};

export const setHasFastLearner = (hasFastLearner: boolean) => {
  useSkillPlannerStore.setState({ hasFastLearner });
};

export const setIgnoreStaminaConsumption = (ignoreStaminaConsumption: boolean) => {
  useSkillPlannerStore.setState({ ignoreStaminaConsumption });
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
  useSkillPlannerStore.setState((state) => ({
    isOptimizing,
    progress: isOptimizing ? state.progress : null,
  }));
};

export const setProgress = (progress: OptimizationProgress | null) => {
  useSkillPlannerStore.setState({ progress });
};

export const setResult = (result: OptimizationResult | null) => {
  useSkillPlannerStore.setState({ result });
};

export const setLastOptimizationFingerprint = (lastOptimizationFingerprint: string | null) => {
  useSkillPlannerStore.setState({ lastOptimizationFingerprint });
};

export const clearResult = () => {
  useSkillPlannerStore.setState({ result: null, lastOptimizationFingerprint: null });
};
