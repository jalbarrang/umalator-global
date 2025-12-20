import { create } from 'zustand';
import {
  DEFAULT_CALCULATOR_INPUT,
} from '../types';
import type {
  StaminaCalculationResult,
  StaminaCalculatorInput,
  StaminaCalculatorState} from '../types';

export const useStaminaCalculatorStore = create<StaminaCalculatorState>(
  (set, _get) => ({
    // Initial state
    input: DEFAULT_CALCULATOR_INPUT,
    result: null,
    isCalculating: false,
    error: null,

    // Actions
    setInput: (partialInput: Partial<StaminaCalculatorInput>) => {
      set((state) => ({
        input: { ...state.input, ...partialInput },
      }));
    },

    setResult: (result: StaminaCalculationResult) => {
      set({ result, isCalculating: false, error: null });
    },

    setCalculating: (isCalculating: boolean) => {
      set({ isCalculating });
    },

    setError: (error: string | null) => {
      set({ error, isCalculating: false });
    },

    calculate: () => {
      set({ isCalculating: true, error: null });

      // Worker will be triggered by the hook
      // This is just a state update to indicate calculation started
    },

    reset: () => {
      set({
        input: DEFAULT_CALCULATOR_INPUT,
        result: null,
        isCalculating: false,
        error: null,
      });
    },
  }),
);
