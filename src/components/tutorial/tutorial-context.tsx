/**
 * Tutorial Context Provider
 *
 * Manages global tutorial state and provides actions for navigation.
 * This replaces the driver.js instance management with React context.
 */

import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { TutorialActions, TutorialId, TutorialState, TutorialStep } from './types';

interface TutorialContextValue extends TutorialState, TutorialActions {}

const TutorialContext = createContext<TutorialContextValue | null>(null);

interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const [state, setState] = useState<TutorialState>({
    isActive: false,
    currentStepIndex: 0,
    steps: [],
    tutorialId: null,
  });

  const start = useCallback((tutorialId: TutorialId, steps: Array<TutorialStep>) => {
    setState({
      isActive: true,
      currentStepIndex: 0,
      steps,
      tutorialId,
    });
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      if (prev.currentStepIndex < prev.steps.length - 1) {
        return { ...prev, currentStepIndex: prev.currentStepIndex + 1 };
      }
      // On last step, "next" button closes the tutorial
      return { ...prev, isActive: false };
    });
  }, []);

  const previous = useCallback(() => {
    setState((prev) => {
      if (prev.currentStepIndex > 0) {
        return { ...prev, currentStepIndex: prev.currentStepIndex - 1 };
      }
      return prev;
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isActive: false }));
  }, []);

  const goToStep = useCallback((index: number) => {
    setState((prev) => {
      if (index >= 0 && index < prev.steps.length) {
        return { ...prev, currentStepIndex: index };
      }
      return prev;
    });
  }, []);

  const value: TutorialContextValue = {
    ...state,
    start,
    next,
    previous,
    close,
    goToStep,
  };

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

/**
 * Hook to access tutorial context
 *
 * @throws Error if used outside TutorialProvider
 */
export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

/**
 * Hook to get the current tutorial step
 */
export function useCurrentStep() {
  const { steps, currentStepIndex, isActive } = useTutorial();
  if (!isActive || steps.length === 0) {
    return null;
  }
  return steps[currentStepIndex] ?? null;
}

/**
 * Hook to check if tutorial is on first/last step
 */
export function useTutorialProgress() {
  const { currentStepIndex, steps, isActive } = useTutorial();
  return {
    isActive,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === steps.length - 1,
    currentStep: currentStepIndex + 1,
    totalSteps: steps.length,
    progress: steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0,
  };
}
