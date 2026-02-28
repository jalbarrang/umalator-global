import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';

export type CompareRunnerId = 'uma1' | 'uma2';

type ForcedPositionsStore = {
  uma1: Record<string, number>;
  uma2: Record<string, number>;
};

export const useForcedPositionsStore = create<ForcedPositionsStore>()(() => ({
  uma1: {},
  uma2: {},
}));

export const setForcedPosition = (
  runnerId: CompareRunnerId,
  skillId: string | number,
  position: number,
) => {
  const normalizedSkillId = String(skillId);

  useForcedPositionsStore.setState((prev) => ({
    ...prev,
    [runnerId]: {
      ...prev[runnerId],
      [normalizedSkillId]: position,
    },
  }));
};

export const clearForcedPosition = (runnerId: CompareRunnerId, skillId: string | number) => {
  const normalizedSkillId = String(skillId);

  useForcedPositionsStore.setState((prev) => {
    const { [normalizedSkillId]: _removed, ...rest } = prev[runnerId];

    return {
      ...prev,
      [runnerId]: rest,
    };
  });
};

export const clearAllForcedPositions = () => {
  useForcedPositionsStore.setState({ uma1: {}, uma2: {} });
};

export const useForcedPositions = () => {
  return useForcedPositionsStore(
    useShallow((state) => ({
      uma1: state.uma1,
      uma2: state.uma2,
    })),
  );
};
