/**
 * Unit tests for skill planner store
 */

import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { enableMapSet } from 'immer';
import {
  addCandidate,
  clearAll,
  clearResult,
  getCandidate,
  removeCandidate,
  setBudget,
  setHasFastLearner,
  setIsOptimizing,
  setProgress,
  setResult,
  updateCandidate,
  useSkillPlannerStore,
} from '../store';
import type { OptimizationProgress, OptimizationResult } from '../types';

// Enable MapSet support for Immer
enableMapSet();

// Mock the cost calculator
mock.module('../cost-calculator', () => ({
  calculateSkillCost: (skillId: string, hintLevel: number, hasFastLearner: boolean) => {
    const baseCosts: Record<string, number> = {
      '1': 100,
      '2': 200,
      '3': 50,
    };
    const baseCost = baseCosts[skillId] ?? 100;
    const hintDiscount = [0, 0.1, 0.2, 0.3, 0.35, 0.4][hintLevel] ?? 0;
    const flMultiplier = hasFastLearner ? 0.9 : 1.0;
    return Math.floor(baseCost * (1 - hintDiscount) * flMultiplier);
  },
}));

// Mock createRunnerState to avoid complex dependencies
mock.module('@/modules/runners/components/runner-card/types', () => ({
  createRunnerState: () => ({
    outfitId: '',
    speed: 1200,
    stamina: 1200,
    power: 800,
    guts: 400,
    wisdom: 400,
    strategy: 'Front Runner',
    distanceAptitude: 'S',
    surfaceAptitude: 'A',
    strategyAptitude: 'A',
    mood: 3,
    skills: [],
    forcedSkillPositions: {},
  }),
}));

mock.module('@/utils/races', () => ({
  createRaceConditions: () => ({}),
}));

mock.module('@/utils/constants', () => ({
  DEFAULT_COURSE_ID: 10101,
  DEFAULT_SEED: 0,
}));

describe('Skill Planner Store', () => {
  beforeEach(() => {
    // Reset store to initial state - match new structure
    useSkillPlannerStore.setState({
      runner: {
        outfitId: '',
        speed: 1200,
        stamina: 1200,
        power: 800,
        guts: 400,
        wisdom: 400,
        strategy: 'Front Runner',
        distanceAptitude: 'S',
        surfaceAptitude: 'A',
        strategyAptitude: 'A',
        mood: 3,
        skills: [],
        forcedSkillPositions: {},
      },
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
      course: {
        id: 10101,
        params: {},
      },
      seed: 0,
    } as any);
  });

  describe('initial state', () => {
    it('should have empty candidates map', () => {
      const state = useSkillPlannerStore.getState();
      expect(Object.keys(state.candidates).length).toBe(0);
    });

    it('should have default budget of 1000', () => {
      const state = useSkillPlannerStore.getState();
      expect(state.budget).toBe(1000);
    });

    it('should have Fast Learner disabled by default', () => {
      const state = useSkillPlannerStore.getState();
      expect(state.hasFastLearner).toBe(false);
    });

    it('should not be optimizing', () => {
      const state = useSkillPlannerStore.getState();
      expect(state.isOptimizing).toBe(false);
    });

    it('should have null progress and result', () => {
      const state = useSkillPlannerStore.getState();
      expect(state.progress).toBeNull();
      expect(state.result).toBeNull();
    });
  });

  describe('addCandidate', () => {
    it('should add a new candidate skill', () => {
      addCandidate('1', 0);
      const state = useSkillPlannerStore.getState();

      expect(Object.keys(state.candidates).length).toBe(1);
      expect(getCandidate('1')).toBeDefined();
    });

    it('should calculate effective cost on add', () => {
      addCandidate('1', 0);
      const candidate = getCandidate('1');

      expect(candidate?.effectiveCost).toBe(100); // baseCost for '1' is 100
    });

    it('should set default properties for new candidate', () => {
      addCandidate('1', 2);
      const candidate = getCandidate('1');

      expect(candidate?.skillId).toBe('1');
      expect(candidate?.hintLevel).toBe(2);
      expect(candidate?.isObtained).toBe(false);
      expect(candidate?.isStackable).toBe(false);
    });

    it('should not add duplicate candidates', () => {
      addCandidate('1', 0);
      addCandidate('1', 1); // Try to add again
      const state = useSkillPlannerStore.getState();

      expect(Object.keys(state.candidates).length).toBe(1);
      // Original hint level should be preserved
      expect(getCandidate('1')?.hintLevel).toBe(0);
    });

    it('should allow adding multiple different candidates', () => {
      addCandidate('1', 0);
      addCandidate('2', 1);
      addCandidate('3', 2);
      const state = useSkillPlannerStore.getState();

      expect(Object.keys(state.candidates).length).toBe(3);
      expect(getCandidate('1')).toBeDefined();
      expect(getCandidate('2')).toBeDefined();
      expect(getCandidate('3')).toBeDefined();
    });
  });

  describe('removeCandidate', () => {
    beforeEach(() => {
      addCandidate('1', 0);
      addCandidate('2', 0);
    });

    it('should remove a candidate skill', () => {
      removeCandidate('1');
      const state = useSkillPlannerStore.getState();

      expect(Object.keys(state.candidates).length).toBe(1);
      expect(getCandidate('1')).toBeUndefined();
      expect(getCandidate('2')).toBeDefined();
    });

    it('should handle removing non-existent candidate', () => {
      removeCandidate('999');
      const state = useSkillPlannerStore.getState();

      expect(Object.keys(state.candidates).length).toBe(2);
    });

    it('should allow removing all candidates', () => {
      removeCandidate('1');
      removeCandidate('2');

      const state = useSkillPlannerStore.getState();
      expect(Object.keys(state.candidates).length).toBe(0);
    });
  });

  describe('updateCandidate', () => {
    beforeEach(() => {
      addCandidate('1', 0);
    });

    it('should update hint level and recalculate cost', () => {
      updateCandidate('1', { hintLevel: 3 });
      const candidate = getCandidate('1');

      expect(candidate?.hintLevel).toBe(3);
      // 100 * 0.7 = 70
      expect(candidate?.effectiveCost).toBe(70);
    });

    it('should update isObtained flag', () => {
      updateCandidate('1', { isObtained: true });
      const candidate = getCandidate('1');

      expect(candidate?.isObtained).toBe(true);
      // effectiveCost shows discounted cost, but isObtained=true means it's actually free
      // The UI logic will check isObtained flag first
    });

    it('should update isStackable flag', () => {
      updateCandidate('1', { isStackable: true });
      const candidate = getCandidate('1');

      expect(candidate?.isStackable).toBe(true);
    });

    it('should handle updating non-existent candidate', () => {
      updateCandidate('999', { hintLevel: 5 });

      // Should not crash, candidate simply doesn't exist
      expect(getCandidate('999')).toBeUndefined();
    });

    it('should allow partial updates', () => {
      updateCandidate('1', { isStackable: true });
      const candidate = getCandidate('1');

      // Other properties should remain unchanged
      expect(candidate?.skillId).toBe('1');
      expect(candidate?.hintLevel).toBe(0);
      expect(candidate?.isObtained).toBe(false);
      expect(candidate?.isStackable).toBe(true);
    });
  });

  describe('setBudget', () => {
    it('should update budget', () => {
      setBudget(500);
      const state = useSkillPlannerStore.getState();

      expect(state.budget).toBe(500);
    });

    it('should not allow negative budget', () => {
      setBudget(-100);
      const state = useSkillPlannerStore.getState();

      expect(state.budget).toBe(0);
    });

    it('should allow budget of 0', () => {
      setBudget(0);
      const state = useSkillPlannerStore.getState();

      expect(state.budget).toBe(0);
    });

    it('should allow large budgets', () => {
      setBudget(10000);
      const state = useSkillPlannerStore.getState();

      expect(state.budget).toBe(10000);
    });
  });

  describe('setHasFastLearner', () => {
    beforeEach(() => {
      addCandidate('1', 0);
      addCandidate('2', 1);
    });

    it('should update Fast Learner flag', () => {
      setHasFastLearner(true);
      const state = useSkillPlannerStore.getState();

      expect(state.hasFastLearner).toBe(true);
    });

    it('should recalculate all candidate costs when Fast Learner changes', () => {
      // Initial costs
      expect(getCandidate('1')?.effectiveCost).toBe(100); // no FL
      expect(getCandidate('2')?.effectiveCost).toBe(180); // 200 * 0.9 (hint 1)

      // Enable Fast Learner
      setHasFastLearner(true);

      // 100 * 0.9 (FL) = 90
      expect(getCandidate('1')?.effectiveCost).toBe(90);
      // 200 * 0.9 (hint) * 0.9 (FL) = 162
      expect(getCandidate('2')?.effectiveCost).toBe(162);
    });

    it('should handle toggling Fast Learner off', () => {
      setHasFastLearner(true);
      setHasFastLearner(false);
      const state = useSkillPlannerStore.getState();

      expect(state.hasFastLearner).toBe(false);
      expect(getCandidate('1')?.effectiveCost).toBe(100);
    });
  });

  describe('setIsOptimizing', () => {
    it('should set optimizing state to true', () => {
      setIsOptimizing(true);
      const state = useSkillPlannerStore.getState();

      expect(state.isOptimizing).toBe(true);
    });

    it('should set optimizing state to false', () => {
      setIsOptimizing(true);
      setIsOptimizing(false);
      const state = useSkillPlannerStore.getState();

      expect(state.isOptimizing).toBe(false);
    });

    it('should clear progress when setting to false', () => {
      const progress: OptimizationProgress = {
        completed: 5,
        total: 10,
        currentBest: null,
      };
      setProgress(progress);
      setIsOptimizing(false);
      const state = useSkillPlannerStore.getState();

      expect(state.progress).toBeNull();
    });
  });

  describe('setProgress', () => {
    it('should update optimization progress', () => {
      const progress: OptimizationProgress = {
        completed: 5,
        total: 10,
        currentBest: {
          skills: ['1', '2'],
          cost: 150,
          bashin: 12.5,
        },
      };
      setProgress(progress);
      const state = useSkillPlannerStore.getState();

      expect(state.progress).toEqual(progress);
    });

    it('should allow clearing progress', () => {
      const progress: OptimizationProgress = {
        completed: 5,
        total: 10,
        currentBest: null,
      };
      setProgress(progress);
      setProgress(null);
      const state = useSkillPlannerStore.getState();

      expect(state.progress).toBeNull();
    });
  });

  describe('setResult', () => {
    it('should update optimization result', () => {
      const result: OptimizationResult = {
        skillsToBuy: ['1', '2', '3'],
        totalCost: 250,
        bashinStats: {
          min: 12.5,
          max: 18.9,
          mean: 15.5,
          median: 15.7,
        },
        simulationCount: 100,
        timeTaken: 5000,
        allResults: [],
      };
      setResult(result);
      const state = useSkillPlannerStore.getState();

      expect(state.result).toEqual(result);
    });

    it('should allow clearing result', () => {
      const result: OptimizationResult = {
        skillsToBuy: ['1'],
        totalCost: 100,
        bashinStats: {
          min: 3.2,
          max: 6.8,
          mean: 5.1,
          median: 5.0,
        },
        simulationCount: 50,
        timeTaken: 2000,
        allResults: [],
      };
      setResult(result);
      setResult(null);
      const state = useSkillPlannerStore.getState();

      expect(state.result).toBeNull();
    });
  });

  describe('clearResult', () => {
    it('should clear result without affecting other state', () => {
      addCandidate('1', 0);
      const result: OptimizationResult = {
        skillsToBuy: ['1'],
        totalCost: 100,
        bashinStats: {
          min: 3.2,
          max: 6.8,
          mean: 5.1,
          median: 5.0,
        },
        simulationCount: 50,
        timeTaken: 2000,
        allResults: [],
      };
      setResult(result);
      clearResult();
      const state = useSkillPlannerStore.getState();

      expect(state.result).toBeNull();
      expect(Object.keys(state.candidates).length).toBe(1); // Candidates should remain
      expect(state.budget).toBe(1000);
    });
  });

  describe('clearAll', () => {
    it('should reset all state to defaults', () => {
      // Set up some state
      addCandidate('1', 0);
      addCandidate('2', 1);
      setBudget(500);
      setIsOptimizing(true);
      const progress: OptimizationProgress = {
        completed: 5,
        total: 10,
        currentBest: null,
      };
      setProgress(progress);

      // Clear all
      clearAll();
      const state = useSkillPlannerStore.getState();

      expect(Object.keys(state.candidates).length).toBe(0);
      expect(state.result).toBeNull();
      expect(state.progress).toBeNull();
      expect(state.isOptimizing).toBe(false);
      // Budget should remain (only clears candidates and results)
      expect(state.budget).toBe(500);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete workflow', () => {
      // Add candidates
      addCandidate('1', 0);
      addCandidate('2', 1);
      addCandidate('3', 0);

      // Update one candidate
      updateCandidate('2', { hintLevel: 3, isStackable: true });

      // Set budget and modifiers
      setBudget(500);
      setHasFastLearner(true);

      // Verify final state
      const state = useSkillPlannerStore.getState();
      expect(Object.keys(state.candidates).length).toBe(3);
      expect(state.budget).toBe(500);
      expect(state.hasFastLearner).toBe(true);

      // Check that costs were recalculated
      const candidate2 = getCandidate('2');
      expect(candidate2?.isStackable).toBe(true);
      expect(candidate2?.effectiveCost).toBeLessThan(200); // Has discounts
    });

    it('should handle optimization lifecycle', () => {
      addCandidate('1', 0);

      // Start optimization
      setIsOptimizing(true);
      expect(useSkillPlannerStore.getState().isOptimizing).toBe(true);

      // Update progress
      setProgress({
        completed: 50,
        total: 100,
        currentBest: { skills: ['1'], cost: 100, bashin: 5.0 },
      });
      expect(useSkillPlannerStore.getState().progress?.completed).toBe(50);

      // Complete optimization
      setResult({
        skillsToBuy: ['1'],
        totalCost: 100,
        bashinStats: {
          min: 3.5,
          max: 7.0,
          mean: 5.3,
          median: 5.2,
        },
        simulationCount: 100,
        timeTaken: 3000,
        allResults: [],
      });
      setIsOptimizing(false);

      const state = useSkillPlannerStore.getState();
      expect(state.isOptimizing).toBe(false);
      expect(state.result?.bashinStats.median).toBe(5.2);
      expect(state.progress).toBeNull(); // Cleared when optimization ends
    });
  });
});
