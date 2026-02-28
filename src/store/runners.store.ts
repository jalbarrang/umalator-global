import { create } from 'zustand';

import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { toast } from 'sonner';
import { cloneDeep } from 'es-toolkit';
import { useMemo } from 'react';
import { useSettingsStore } from './settings.store';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { createRunnerState, runawaySkillId } from '@/modules/runners/components/runner-card/types';
import {
  getGeneVersionSkillId,
  getUniqueSkillForByUmaId,
  skillsById,
} from '@/modules/skills/utils';

type RunnerType = 'uma1' | 'uma2';

type IRunnersStore = {
  uma1: RunnerState;
  uma2: RunnerState;

  // UI Specific
  runnerId: RunnerType;
};

export const useRunnersStore = create<IRunnersStore>()(
  persist(
    (_) => ({
      uma1: createRunnerState(),
      uma2: createRunnerState(),
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

  const hasOutfit = useMemo(() => runner.outfitId !== '', [runner.outfitId]);
  const hasRunawaySkill = useMemo(() => runner.skills.includes(runawaySkillId), [runner.skills]);

  const handleUpdateRunner = (runnerState: RunnerState) => {
    setRunner(runnerId, runnerState);
  };

  const handleResetRunner = () => {
    resetRunner(runnerId);
    toast.success('Runner reset');
  };

  const handleAddSkill = (skillId: string) => {
    const skill = skillsById.get(skillId);
    const skillRarity = skill?.rarity;
    let newSkillId = skillId;

    // If Runner has outfit, it means it has a unique skill.
    // So if we are adding a unique skill, add the gene version instead
    if (hasOutfit && skillRarity && isUniqueSkill(skillRarity)) {
      newSkillId = getGeneVersionSkillId(skillId);
    }

    setSkillToRunner(runnerId, newSkillId);
  };

  return {
    runnerId,
    runner,
    updateRunner: handleUpdateRunner,
    resetRunner: handleResetRunner,
    addSkill: handleAddSkill,
    hasRunawaySkill,
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
  useRunnersStore.setState({
    uma1: createRunnerState(),
    uma2: createRunnerState(),
  });
};

export const resetAllRunners = () => {
  useRunnersStore.setState({
    uma1: createRunnerState(),
    uma2: createRunnerState(),
  });

  toast.success('All runners reset');
};

// Methods to generalize modifying a runner

export const showRunner = (runner: RunnerType) => {
  useRunnersStore.setState({ runnerId: runner });
};

export const setSkillToRunner = (runner: RunnerType, skillId: string) => {
  const state = useRunnersStore.getState();

  if (state[runner].skills.includes(skillId)) {
    toast.error('Runner already has this skill');
    return;
  }

  useRunnersStore.setState((prev) => {
    const newRunnerState = cloneDeep(prev[runner]);
    newRunnerState.skills.push(skillId);

    return { ...prev, [runner]: newRunnerState };
  });
};

export const swapWithRunner = (fromRunner: RunnerType, toRunner: RunnerType) => {
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

  useRunnersStore.setState({
    [toRunner]: cloneDeep(fromRunnerState),
  });

  toast.success('Runner copied');
};

export const replaceRunnerOutfit = (
  runner: RunnerState,
  newOutfitId: string,
  currentSkills: Array<string>,
): RunnerState => {
  const newSkills: Array<string> = [];

  for (const skillId of currentSkills) {
    const skillData = skillsById.get(skillId);

    // Clean up skills that are not 3* or lower
    if (skillData?.rarity && skillData.rarity < 3) {
      newSkills.push(skillId);
    }
  }

  if (newOutfitId) {
    newSkills.push(getUniqueSkillForByUmaId(newOutfitId));
  }

  const newRunnerState = cloneDeep(runner);
  newRunnerState.outfitId = newOutfitId;
  newRunnerState.skills = newSkills;

  return newRunnerState;
};

export const isWhiteSkill = (skillRarity: number) => {
  return skillRarity === 1;
};

export const isGoldSkill = (skillRarity: number) => {
  return skillRarity === 2;
};

export const isUniqueSkill = (skillRarity: number) => {
  return [3, 4, 5].includes(skillRarity);
};

export const isEvolutionSkill = (skillRarity: number) => {
  return skillRarity === 6;
};

// Library Integration Functions

export const loadRunnerFromLibrary = (
  runner: RunnerType,
  libraryRunner: RunnerState & { id: string },
) => {
  const runnerData = cloneDeep(libraryRunner);
  runnerData.linkedRunnerId = libraryRunner.id;

  useRunnersStore.setState({ [runner]: runnerData });
  toast.success(`Loaded "${libraryRunner.id}" to simulation`);
};

export const syncRunnerToLibrary = (runner: RunnerType) => {
  const state = useRunnersStore.getState();
  const runnerState = state[runner];

  if (!runnerState.linkedRunnerId) {
    toast.error('No linked runner to sync');
    return null;
  }

  return runnerState.linkedRunnerId;
};

export const unlinkRunner = (runner: RunnerType) => {
  useRunnersStore.setState((prev) => {
    const newRunnerState = cloneDeep(prev[runner]);
    delete newRunnerState.linkedRunnerId;

    return { ...prev, [runner]: newRunnerState };
  });

  toast.success('Runner unlinked from library');
};

export const linkRunner = (runner: RunnerType, libraryRunnerId: string) => {
  useRunnersStore.setState((prev) => {
    const newRunnerState = cloneDeep(prev[runner]);
    newRunnerState.linkedRunnerId = libraryRunnerId;

    return { ...prev, [runner]: newRunnerState };
  });

  toast.success('Runner linked to library');
};
