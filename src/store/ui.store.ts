import { Mode } from '@/utils/settings';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';

type ISidebar = {
  activePanel: string | null;
  hidden: boolean;
};

export type IUIStore = {
  mode: Mode;
  currentIdx: number;
  expanded: boolean;

  // Simulation runtime state
  isSimulationRunning: boolean;
  runOnceCounter: number;

  // Dropdown/modal state (ephemeral, not persisted)
  isPacemakerDropdownOpen: boolean;
  showWitVarianceSettings: boolean;
  showVirtualPacemakerOnGraph: boolean;

  leftSide: ISidebar;
};

export const useUIStore = create<IUIStore>()(
  persist(
    (_) => ({
      mode: Mode.Compare,
      currentIdx: 0,
      expanded: false,
      isSimulationRunning: false,
      runOnceCounter: 0,
      isPacemakerDropdownOpen: false,
      showWitVarianceSettings: false,
      showVirtualPacemakerOnGraph: false,
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
        mode: state.mode,
        currentIdx: state.currentIdx,
        expanded: state.expanded,
      }),
    },
  ),
);

export const setMode = (mode: Mode) => {
  useUIStore.setState({ mode });
};

export const setCurrentIdx = (currentIdx: number) => {
  useUIStore.setState({ currentIdx });
};

export const setExpanded = (expanded: boolean) => {
  useUIStore.setState({ expanded });
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

export const setShowWitVarianceSettings = (
  showWitVarianceSettings: boolean,
) => {
  useUIStore.setState({ showWitVarianceSettings });
};

export const toggleShowVirtualPacemakerOnGraph = () => {
  useUIStore.setState((state) => ({
    showVirtualPacemakerOnGraph: !state.showVirtualPacemakerOnGraph,
  }));
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
