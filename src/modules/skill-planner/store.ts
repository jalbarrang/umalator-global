import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { createRunnerState } from '../runners/components/runner-card/types';
import { calculateSkillCost } from './cost-calculator';
import type { RunnerState } from '../runners/components/runner-card/types';
import type { CandidateSkill, OptimizationProgress, OptimizationResult } from './types';

interface SkillPlannerState {
  runner: RunnerState;
  // Candidate skills
  candidates: Record<string, CandidateSkill>;

  // Budget and modifiers
  budget: number;
  hasFastLearner: boolean;

  // Optimization state
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
      budget: 1000,
      hasFastLearner: false,
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
  hasFastLearner: boolean;
  hintLevel?: number;
  isObtained?: boolean;
};

export const createCandidate = (params: CreateCandidateParams) => {
  const { skillId, hintLevel = 0, hasFastLearner, isObtained = false } = params;

  return {
    skillId,
    hintLevel: hintLevel as CandidateSkill['hintLevel'],
    isObtained,
    isStackable: false,
    effectiveCost: calculateSkillCost(
      skillId,
      hintLevel as CandidateSkill['hintLevel'],
      hasFastLearner,
    ),
  };
};

export const setCandidates = (candidates: Record<string, CandidateSkill>) => {
  useSkillPlannerStore.setState({ candidates });
};

export const addCandidate = (skillId: string, hintLevel: number = 0) => {
  const { hasFastLearner } = useSkillPlannerStore.getState();

  if (hasCandidate(skillId)) {
    return;
  }

  const candidate: CandidateSkill = createCandidate({ skillId, hintLevel, hasFastLearner });

  useSkillPlannerStore.setState((state) => {
    return {
      candidates: {
        ...state.candidates,
        [skillId]: candidate,
      },
    };
  });
};

export const removeCandidate = (skillId: string) => {
  useSkillPlannerStore.setState((prev) => {
    const newCandidates = { ...prev.candidates };
    delete newCandidates[skillId];

    // Remove the skill from the runner
    const runner = { ...prev.runner };
    runner.skills = runner.skills.filter((id) => id !== skillId);

    return { candidates: newCandidates, runner: runner };
  });
};

export const getCandidate = (skillId: string) => {
  const { candidates } = useSkillPlannerStore.getState();

  return candidates[skillId];
};

export const setCandidateObtained = (skillId: string, isObtained: boolean) => {
  const { candidates, hasFastLearner } = useSkillPlannerStore.getState();

  const candidate = { ...candidates[skillId], isObtained };
  candidate.effectiveCost = calculateSkillCost(
    candidate.skillId,
    candidate.hintLevel,
    hasFastLearner,
  );

  useSkillPlannerStore.setState((state) => {
    return {
      candidates: {
        ...state.candidates,
        [skillId]: candidate,
      },
    };
  });
};

export const setCandidateHintLevel = (skillId: string, hintLevel: number) => {
  const { candidates, hasFastLearner } = useSkillPlannerStore.getState();

  const candidate = { ...candidates[skillId], hintLevel: hintLevel as CandidateSkill['hintLevel'] };

  candidate.effectiveCost = calculateSkillCost(
    candidate.skillId,
    candidate.hintLevel,
    hasFastLearner,
  );

  useSkillPlannerStore.setState((state) => {
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
  useSkillPlannerStore.setState(({ candidates }) => {
    return {
      hasFastLearner,
      candidates: Object.fromEntries(
        Object.entries(candidates).map(([skillId, candidate]) => [
          skillId,
          {
            ...candidate,
            effectiveCost: calculateSkillCost(
              candidate.skillId,
              candidate.hintLevel,
              hasFastLearner,
            ),
          },
        ]),
      ),
    };
  });
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
  useSkillPlannerStore.setState({ runner: createRunnerState() });
};

export const clearAll = () => {
  useSkillPlannerStore.setState({
    candidates: {},
    result: null,
    progress: null,
    isOptimizing: false,
  });
};

export const clearCandidates = () => {
  useSkillPlannerStore.setState({
    candidates: {},
    skillDrawerOpen: false,
  });
};

export const clearResult = () => {
  useSkillPlannerStore.setState({ result: null });
};
