import { create } from 'zustand';

type UmaSkillSelectionState = {
  selectedSkillIds: Set<string>;
};

export const useUmaSkillSelectionStore = create<UmaSkillSelectionState>()(() => ({
  selectedSkillIds: new Set<string>()
}));

export const resetUmaSkillSelectionForRace = (releasedActivatableIds: Array<string>) => {
  useUmaSkillSelectionStore.setState({
    selectedSkillIds: new Set(releasedActivatableIds)
  });
};

export const toggleUmaSkillSelected = (skillId: string) => {
  useUmaSkillSelectionStore.setState((state) => {
    const next = new Set(state.selectedSkillIds);

    if (next.has(skillId)) {
      next.delete(skillId);
    } else {
      next.add(skillId);
    }

    return { selectedSkillIds: next };
  });
};

export const selectAllUmaSkills = (skillIds: Array<string>) => {
  useUmaSkillSelectionStore.setState((state) => {
    const next = new Set(state.selectedSkillIds);

    for (const id of skillIds) {
      next.add(id);
    }

    return { selectedSkillIds: next };
  });
};

export const deselectAllUmaSkills = (skillIds: Array<string>) => {
  useUmaSkillSelectionStore.setState((state) => {
    const next = new Set(state.selectedSkillIds);

    for (const id of skillIds) {
      next.delete(id);
    }

    return { selectedSkillIds: next };
  });
};
