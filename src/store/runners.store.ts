import { create } from 'zustand';
import { PosKeepMode } from '@simulation/lib/RaceSolver';

import {
  createRunnerState,
  RunnerState,
} from '@/modules/runners/components/runner-card/types';

import { useSettingsStore } from './settings.store';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';

type IRunnersStore = {
  uma1: RunnerState;
  uma2: RunnerState;
  pacer: RunnerState;
};

export const useRunnersStore = create<IRunnersStore>()(
  persist(
    (_) => ({
      uma1: createRunnerState(),
      uma2: createRunnerState(),
      pacer: createRunnerState({
        strategy: 'Nige',
      }),
    }),
    {
      name: 'umalator-runners',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useRunnerByName = (runner: 'uma1' | 'uma2' | 'pacer') => {
  return useRunnersStore(useShallow((state) => state[runner]));
};

export const setUma1 = (uma1: RunnerState) => {
  useRunnersStore.setState({ uma1 });
};

export const setUma2 = (uma2: RunnerState) => {
  useRunnersStore.setState({ uma2 });
};

export const setPacer = (pacer: RunnerState) => {
  useRunnersStore.setState({ pacer });
};

export const resetUma1 = () => {
  useRunnersStore.setState({ uma1: createRunnerState() });
};

export const resetUma2 = () => {
  useRunnersStore.setState({ uma2: createRunnerState() });
};

export const resetPacer = () => {
  useRunnersStore.setState({ pacer: createRunnerState({ strategy: 'Nige' }) });
};

export const resetUmas = () => {
  const { posKeepMode } = useSettingsStore.getState();

  useRunnersStore.setState({
    uma1: createRunnerState(),
    uma2: createRunnerState(),
  });

  if (posKeepMode === PosKeepMode.Virtual) {
    useRunnersStore.setState({
      pacer: createRunnerState({ strategy: 'Nige' }),
    });
  }
};

export const resetAllUmas = () => {
  useRunnersStore.setState({
    uma1: createRunnerState(),
    uma2: createRunnerState(),
    pacer: createRunnerState({ strategy: 'Nige' }),
  });
};

// Add these actions to runners.store.ts:

export const copyUmaToRight = () => {
  const { uma1 } = useRunnersStore.getState();
  window.dispatchEvent(
    new CustomEvent('copyUma', { detail: { direction: 'to-right' } }),
  );
  useRunnersStore.setState({ uma2: uma1 });
};

export const copyUmaToLeft = () => {
  const { uma2 } = useRunnersStore.getState();
  window.dispatchEvent(
    new CustomEvent('copyUma', { detail: { direction: 'to-left' } }),
  );
  useRunnersStore.setState({ uma1: uma2 });
};

export const swapUmas = () => {
  const { uma1, uma2 } = useRunnersStore.getState();
  window.dispatchEvent(
    new CustomEvent('copyUma', { detail: { direction: 'swap' } }),
  );
  useRunnersStore.setState({ uma1: uma2, uma2: uma1 });
};

export const updateForcedSkillPosition = (
  umaType: 'uma1' | 'uma2' | 'pacer',
  skillId: string,
  position: number,
) => {
  const state = useRunnersStore.getState();
  const uma = state[umaType];

  useRunnersStore.setState({
    [umaType]: {
      ...uma,
      forcedSkillPositions: {
        ...uma.forcedSkillPositions,
        [skillId]: position,
      },
    },
  });
};

export const addSkillToUma1 = (skillId: string) => {
  const { uma1 } = useRunnersStore.getState();
  window.dispatchEvent(
    new CustomEvent('addSkillFromTable', { detail: { skillId } }),
  );
  useRunnersStore.setState({
    uma1: { ...uma1, skills: [...uma1.skills, skillId] },
  });
};

export const addSkillToUma2 = (skillId: string) => {
  const { uma2 } = useRunnersStore.getState();
  window.dispatchEvent(
    new CustomEvent('addSkillFromTable', { detail: { skillId } }),
  );
  useRunnersStore.setState({
    uma2: { ...uma2, skills: [...uma2.skills, skillId] },
  });
};
