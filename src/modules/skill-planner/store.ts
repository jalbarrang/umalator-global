import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { createRunnerState } from '../runners/components/runner-card/types';
import { calculateSkillCost } from './cost-calculator';
import type { RunnerState } from '../runners/components/runner-card/types';
import type { CandidateSkill, OptimizationProgress, OptimizationResult } from './types';

interface SkillPlannerState {
  runner: RunnerState;
  // Candidate skills
  candidates: Map<string, CandidateSkill>;

  // Budget and modifiers
  budget: number;
  hasFastLearner: boolean;

  // Optimization state
  isOptimizing: boolean;
  progress: OptimizationProgress | null;
  result: OptimizationResult | null;

  skills: {
    open: boolean;
    selected: Array<string>;
  };
}

export const useSkillPlannerStore = create<SkillPlannerState>()(
  immer((_set, _get) => ({
    runner: createRunnerState(),
    candidates: new Map(),
    budget: 1000,
    hasFastLearner: false,
    isOptimizing: false,
    progress: null,
    result: null,
    skills: {
      open: false,
      selected: [],
    },
  })),
);

// Actions

export const setSkillsOpen = (open: boolean) => {
  useSkillPlannerStore.setState((draft) => {
    draft.skills.open = open;
  });
};

export const setSkillsSelected = (selected: Array<string>) => {
  useSkillPlannerStore.setState((draft) => {
    draft.skills.selected = selected;
  });
};

export const setRunner = (runner: RunnerState) => {
  useSkillPlannerStore.setState((draft) => {
    draft.runner = runner;
  });
};

export const addCandidate = (skillId: string, hintLevel: number = 0) => {
  useSkillPlannerStore.setState((draft) => {
    if (!draft.candidates.has(skillId)) {
      const candidate: CandidateSkill = {
        skillId,
        hintLevel: hintLevel as CandidateSkill['hintLevel'],
        isObtained: false,
        isStackable: false,
        effectiveCost: calculateSkillCost(
          skillId,
          hintLevel as CandidateSkill['hintLevel'],
          draft.hasFastLearner,
        ),
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
          draft.hasFastLearner,
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

export const setHasFastLearner = (hasFastLearner: boolean) => {
  useSkillPlannerStore.setState((draft) => {
    draft.hasFastLearner = hasFastLearner;

    // Recalculate all candidate costs when modifiers change
    draft.candidates.forEach((candidate) => {
      candidate.effectiveCost = calculateSkillCost(
        candidate.skillId,
        candidate.hintLevel,
        draft.hasFastLearner,
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

export const clearCandidates = () => {
  useSkillPlannerStore.setState((draft) => {
    draft.candidates.clear();
    draft.skills.selected = [];
  });
};

export const clearResult = () => {
  useSkillPlannerStore.setState((draft) => {
    draft.result = null;
  });
};
