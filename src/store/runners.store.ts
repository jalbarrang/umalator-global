import { create } from 'zustand';
import { PosKeepMode } from '@simulation/lib/RaceSolver';

import {
  createRunnerState,
  RunnerState,
} from '@/modules/runners/components/runner-card/types';

import { useSettingsStore } from './settings.store';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { toast } from 'sonner';

type RunnerType = 'uma1' | 'uma2' | 'pacer';

type IRunnersStore = {
  uma1: RunnerState;
  uma2: RunnerState;
  pacer: RunnerState;

  // UI Specific
  runnerId: RunnerType;
};

export const useRunnersStore = create<IRunnersStore>()(
  persist(
    (_) => ({
      uma1: createRunnerState(),
      uma2: createRunnerState(),
      pacer: createRunnerState({
        strategy: 'Nige',
      }),
      runnerId: 'uma1',
    }),
    {
      name: 'umalator-runners',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useRunner = () => {
  const runnerId = useRunnersStore(useShallow((state) => state.runnerId));
  const runner = useRunnerByName(runnerId);

  const handleUpdateRunner = (runnerState: RunnerState) => {
    setRunner(runnerId, runnerState);
  };

  const handleResetRunner = () => {
    resetRunner(runnerId);
    toast.success('Runner reset');
  };

  return {
    runnerId,
    runner,
    updateRunner: handleUpdateRunner,
    resetRunner: handleResetRunner,
  };
};

export const useRunnerByName = (runner: RunnerType) => {
  return useRunnersStore(useShallow((state) => state[runner]));
};

export const setRunner = (runner: RunnerType, runnerState: RunnerState) => {
  useRunnersStore.setState({ [runner]: runnerState });
};

export const resetRunner = (runner: RunnerType) => {
  useRunnersStore.setState({ [runner]: createRunnerState() });
};

export const resetRunners = () => {
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

export const resetAllRunners = () => {
  useRunnersStore.setState({
    uma1: createRunnerState(),
    uma2: createRunnerState(),
    pacer: createRunnerState({ strategy: 'Nige' }),
  });

  toast.success('All runners reset');
};

// Methods to generalize modifying a runner

export const showRunner = (runner: RunnerType) => {
  useRunnersStore.setState({ runnerId: runner });
};

export const setSkillToRunner = (runner: RunnerType, skillId: string) => {
  const state = useRunnersStore.getState();
  const runnerState = state[runner];

  useRunnersStore.setState({
    [runner]: { ...runnerState, skills: [...runnerState.skills, skillId] },
  });
};

export const swapWithRunner = (
  fromRunner: RunnerType,
  toRunner: RunnerType,
) => {
  const state = useRunnersStore.getState();

  const fromRunnerState = state[fromRunner];
  const toRunnerState = state[toRunner];

  useRunnersStore.setState({
    [fromRunner]: toRunnerState,
    [toRunner]: fromRunnerState,
  });
};

export const copyToRunner = (fromRunner: RunnerType, toRunner: RunnerType) => {
  const state = useRunnersStore.getState();

  const fromRunnerState = state[fromRunner];
  const toRunnerState = state[toRunner];

  useRunnersStore.setState({
    [toRunner]: {
      ...toRunnerState,
      skills: [...toRunnerState.skills, ...fromRunnerState.skills],
    },
  });
};

export const updateForcedSkillPosition = (
  runnerId: RunnerType,
  skillId: number,
  position: number,
) => {
  const state = useRunnersStore.getState();
  const uma = state[runnerId];

  useRunnersStore.setState({
    [runnerId]: {
      ...uma,
      forcedSkillPositions: {
        ...uma.forcedSkillPositions,
        [skillId]: position,
      },
    },
  });
};
