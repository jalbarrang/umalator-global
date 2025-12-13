import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';

type ISidebar = {
  activePanel: string | null;
  hidden: boolean;
};

export type IUIStore = {
  // UI counter state
  runOnceCounter: number;

  // Dropdown/modal state (ephemeral, not persisted)
  isPacemakerDropdownOpen: boolean;
  showVirtualPacemakerOnGraph: boolean;
  showCreditsModal: boolean;
  showChangelogModal: boolean;

  leftSide: ISidebar;
};

export const useUIStore = create<IUIStore>()((_) => ({
  runOnceCounter: 0,
  isPacemakerDropdownOpen: false,
  showVirtualPacemakerOnGraph: false,
  showCreditsModal: false,
  showChangelogModal: false,
  leftSide: {
    activePanel: 'runners',
    hidden: false,
  },
}));

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
