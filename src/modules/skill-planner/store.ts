import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { calculateSkillCost } from './cost-calculator';
import type {
  CandidateSkill,
  CostModifiers,
  OptimizationProgress,
  OptimizationResult,
} from './types';

// Enable Immer's MapSet plugin for Map support
enableMapSet();

interface SkillPlannerState {
  // Candidate skills
  candidates: Map<string, CandidateSkill>;

  // Budget and modifiers
  budget: number;
  modifiers: CostModifiers;

  // Optimization state
  isOptimizing: boolean;
  progress: OptimizationProgress | null;
  result: OptimizationResult | null;
}

export const useSkillPlannerStore = create<SkillPlannerState>()(
  immer((_set, _get) => ({
    candidates: new Map(),
    budget: 1000,
    modifiers: {
      hasFastLearner: false,
    },
    isOptimizing: false,
    progress: null,
    result: null,
  })),
);

// Actions

export const addCandidate = (skillId: string, hintLevel: number = 0) => {
  useSkillPlannerStore.setState((draft) => {
    if (!draft.candidates.has(skillId)) {
      const candidate: CandidateSkill = {
        skillId,
        hintLevel: hintLevel as CandidateSkill['hintLevel'],
        isObtained: false,
        isStackable: false,
        effectiveCost: calculateSkillCost(skillId, hintLevel as CandidateSkill['hintLevel'], draft.modifiers),
      };
      draft.candidates.set(skillId, candidate);
    }
  });
};

export const removeCandidate = (skillId: string) => {
  useSkillPlannerStore.setState((draft) => {
    draft.candidates.delete(skillId);
  });
};

export const updateCandidate = (skillId: string, updates: Partial<CandidateSkill>) => {
  useSkillPlannerStore.setState((draft) => {
    const candidate = draft.candidates.get(skillId);
    if (candidate) {
      Object.assign(candidate, updates);
      // Recalculate effective cost if relevant fields changed
      if ('hintLevel' in updates || 'isObtained' in updates) {
        candidate.effectiveCost = calculateSkillCost(
          candidate.skillId,
          candidate.hintLevel,
          draft.modifiers,
        );
      }
    }
  });
};

export const setBudget = (budget: number) => {
  useSkillPlannerStore.setState((draft) => {
    draft.budget = Math.max(0, budget);
  });
};

export const setModifiers = (modifiers: Partial<CostModifiers>) => {
  useSkillPlannerStore.setState((draft) => {
    Object.assign(draft.modifiers, modifiers);

    // Recalculate all candidate costs when modifiers change
    draft.candidates.forEach((candidate) => {
      candidate.effectiveCost = calculateSkillCost(
        candidate.skillId,
        candidate.hintLevel,
        draft.modifiers,
      );
    });
  });
};

export const setIsOptimizing = (isOptimizing: boolean) => {
  useSkillPlannerStore.setState((draft) => {
    draft.isOptimizing = isOptimizing;
    if (!isOptimizing) {
      draft.progress = null;
    }
  });
};

export const setProgress = (progress: OptimizationProgress | null) => {
  useSkillPlannerStore.setState((draft) => {
    draft.progress = progress;
  });
};

export const setResult = (result: OptimizationResult | null) => {
  useSkillPlannerStore.setState((draft) => {
    draft.result = result;
  });
};

export const clearAll = () => {
  useSkillPlannerStore.setState((draft) => {
    draft.candidates.clear();
    draft.result = null;
    draft.progress = null;
    draft.isOptimizing = false;
  });
};

export const clearResult = () => {
  useSkillPlannerStore.setState((draft) => {
    draft.result = null;
  });
};

