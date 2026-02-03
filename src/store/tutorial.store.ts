import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { driver } from 'driver.js';
import { useShallow } from 'zustand/shallow';
import type { Config, DriveStep, Driver } from 'driver.js';

const TUTORIAL_STORE_NAME = 'umalator-tutorials';

type TutorialId = 'umalator' | 'skill-bassin' | 'uma-bassin';

interface TutorialState {
  // Persisted state
  completedTutorials: Array<TutorialId>;
  dismissedTutorials: Array<TutorialId>;
  firstVisits: Record<string, boolean>;

  // Ephemeral state (not persisted)
  activeDriver: Driver | null;
  activeTutorial: TutorialId | null;
}

type ITutorialStore = TutorialState;

export const useTutorialStore = create<ITutorialStore>()(
  persist(
    (_) => ({
      // Initial state
      completedTutorials: [],
      dismissedTutorials: [],
      firstVisits: {},
      activeDriver: null,
      activeTutorial: null,
    }),
    {
      name: TUTORIAL_STORE_NAME,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        completedTutorials: state.completedTutorials,
        dismissedTutorials: state.dismissedTutorials,
        firstVisits: state.firstVisits,
      }),
    },
  ),
);

// Actions
export const startTutorial = (
  tutorialId: TutorialId,
  steps: Array<DriveStep>,
  config: Partial<Config> = {},
) => {
  const state = useTutorialStore.getState();

  // Destroy existing driver if any
  if (state.activeDriver) {
    state.activeDriver.destroy();
  }

  // Mark as visited
  markVisited(tutorialId);

  // Create driver instance with default config
  const driverObj = driver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    stagePadding: 10,
    stageRadius: 8,
    allowClose: true,
    overlayClickBehavior: 'close',
    smoothScroll: true,
    animate: true,
    popoverClass: 'driver-popover-tutorial',
    ...config,
    steps,
    onDestroyStarted: (element, step, options) => {
      // Only show confirmation if not on last step
      if (driverObj.getActiveIndex() !== undefined && !driverObj.isLastStep()) {
        if (!confirm('Are you sure you want to exit the tutorial?')) {
          return;
        }
      }

      // Call custom handler if provided
      config.onDestroyStarted?.(element, step, options);

      // Proceed with destruction
      driverObj.destroy();
    },
    onDestroyed: (element, step, options) => {
      const currentState = useTutorialStore.getState();

      // Check if tutorial was completed (on last step)
      if (driverObj.isLastStep() && currentState.activeTutorial) {
        completeTutorial(currentState.activeTutorial);
      } else if (
        currentState.activeTutorial &&
        !currentState.completedTutorials.includes(currentState.activeTutorial)
      ) {
        // Tutorial was dismissed before completion
        dismissTutorial(currentState.activeTutorial);
      }

      // Call custom handler if provided
      config.onDestroyed?.(element, step, options);

      // Clear active state
      useTutorialStore.setState({
        activeDriver: null,
        activeTutorial: null,
      });
    },
  });

  // Set active state and start
  useTutorialStore.setState({
    activeDriver: driverObj,
    activeTutorial: tutorialId,
  });

  driverObj.drive();
};

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

export const destroyActiveDriver = () => {
  const state = useTutorialStore.getState();
  if (state.activeDriver) {
    state.activeDriver.destroy();
    useTutorialStore.setState({
      activeDriver: null,
      activeTutorial: null,
    });
  }
};

// Selectors
export const useTutorialStatus = (tutorialId: TutorialId) => {
  return useTutorialStore(
    useShallow((state) => ({
      isCompleted: state.completedTutorials.includes(tutorialId),
      isDismissed: state.dismissedTutorials.includes(tutorialId),
      isActive: state.activeTutorial === tutorialId,
    })),
  );
};

export const useIsFirstVisit = (section: string) => {
  return useTutorialStore((state) => state.firstVisits[section] !== true);
};
