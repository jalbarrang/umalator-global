/**
 * Tutorial Store
 *
 * Manages tutorial completion state and first-visit tracking.
 * Works in conjunction with the TutorialProvider for runtime state.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type { TutorialId } from '@/components/tutorial';

const TUTORIAL_STORE_NAME = 'umalator-tutorials';

interface TutorialState {
  // Persisted state only
  completedTutorials: Array<TutorialId>;
  dismissedTutorials: Array<TutorialId>;
  firstVisits: Record<string, boolean>;
}

type ITutorialStore = TutorialState;

export const useTutorialStore = create<ITutorialStore>()(
  persist(
    (_) => ({
      completedTutorials: [],
      dismissedTutorials: [],
      firstVisits: {},
    }),
    {
      name: TUTORIAL_STORE_NAME,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/**
 * Actions for managing tutorial completion state
 */

export const completeTutorial = (tutorialId: TutorialId) => {
  useTutorialStore.setState((state) => ({
    completedTutorials: state.completedTutorials.includes(tutorialId)
      ? state.completedTutorials
      : [...state.completedTutorials, tutorialId],
    dismissedTutorials: state.dismissedTutorials.filter((id) => id !== tutorialId),
  }));
};

export const dismissTutorial = (tutorialId: TutorialId) => {
  useTutorialStore.setState((state) => ({
    dismissedTutorials: state.dismissedTutorials.includes(tutorialId)
      ? state.dismissedTutorials
      : [...state.dismissedTutorials, tutorialId],
  }));
};

export const resetTutorial = (tutorialId: TutorialId) => {
  useTutorialStore.setState((state) => ({
    completedTutorials: state.completedTutorials.filter((id) => id !== tutorialId),
    dismissedTutorials: state.dismissedTutorials.filter((id) => id !== tutorialId),
    firstVisits: {
      ...state.firstVisits,
      [tutorialId]: false,
    },
  }));
};

export const resetAllTutorials = () => {
  useTutorialStore.setState({
    completedTutorials: [],
    dismissedTutorials: [],
    firstVisits: {},
  });
};

export const isFirstVisit = (section: string): boolean => {
  const state = useTutorialStore.getState();
  return state.firstVisits[section] !== true;
};

export const markVisited = (section: string) => {
  useTutorialStore.setState((state) => ({
    firstVisits: {
      ...state.firstVisits,
      [section]: true,
    },
  }));
};

/**
 * Selectors
 */
export const useTutorialStatus = (tutorialId: TutorialId) => {
  return useTutorialStore(
    useShallow((state) => ({
      isCompleted: state.completedTutorials.includes(tutorialId),
      isDismissed: state.dismissedTutorials.includes(tutorialId),
    })),
  );
};

export const useIsFirstVisit = (section: string) => {
  return useTutorialStore((state) => state.firstVisits[section] !== true);
};
