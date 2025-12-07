import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';

type ISidebar = {
  activePanel: string | null;
  hidden: boolean;
};

export type IUIStore = {
  currentIdx: number;

  // Simulation runtime state
  isSimulationRunning: boolean;
  runOnceCounter: number;

  // Dropdown/modal state (ephemeral, not persisted)
  isPacemakerDropdownOpen: boolean;
  showVirtualPacemakerOnGraph: boolean;
  showCreditsModal: boolean;
  showChangelogModal: boolean;

  leftSide: ISidebar;
};

export const useUIStore = create<IUIStore>()(
  persist(
    (_) => ({
      currentIdx: 0,
      expanded: false,
      isSimulationRunning: false,
      runOnceCounter: 0,
      isPacemakerDropdownOpen: false,
      showVirtualPacemakerOnGraph: false,
      showCreditsModal: false,
      showChangelogModal: false,
      leftSide: {
        activePanel: 'runners',
        hidden: false,
      },
    }),
    {
      name: 'ui-umalator',
      storage: createJSONStorage(() => localStorage),
      // Don't persist ephemeral state
      partialize: (state) => ({
        currentIdx: state.currentIdx,
      }),
    },
  ),
);

export const setCurrentIdx = (currentIdx: number) => {
  useUIStore.setState({ currentIdx });
};

export const setIsSimulationRunning = (isSimulationRunning: boolean) => {
  useUIStore.setState({ isSimulationRunning });
};

export const setRunOnceCounter = (runOnceCounter: number) => {
  useUIStore.setState({ runOnceCounter });
};

export const incrementRunOnceCounter = () => {
  useUIStore.setState((state) => ({
    runOnceCounter: state.runOnceCounter + 1,
  }));
};

export const setIsPacemakerDropdownOpen = (
  isPacemakerDropdownOpen: boolean,
) => {
  useUIStore.setState({ isPacemakerDropdownOpen });
};

export const toggleShowVirtualPacemakerOnGraph = () => {
  useUIStore.setState((state) => ({
    showVirtualPacemakerOnGraph: !state.showVirtualPacemakerOnGraph,
  }));
};

export const setShowCreditsModal = (showCreditsModal: boolean) => {
  useUIStore.setState({ showCreditsModal });
};

export const setShowChangelogModal = (showChangelogModal: boolean) => {
  useUIStore.setState({ showChangelogModal });
};

export const setLeftSidebar = (sidebar: Partial<ISidebar>) => {
  useUIStore.setState((state) => ({
    leftSide: {
      ...state.leftSide,
      ...sidebar,
    },
  }));
};

export const useLeftSidebar = () => {
  return useUIStore(useShallow((state) => state.leftSide));
};
