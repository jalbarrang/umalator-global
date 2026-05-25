import { create } from 'zustand';
import { skillsService } from '@/modules/data/registry';
import { getBaseSkillsToTest } from '@/modules/skills/utils';

type SkillSelectionState = {
  selectedSkillIds: Set<string>;
  initialized: boolean;
};

export const useSkillSelectionStore = create<SkillSelectionState>()(() => ({
  selectedSkillIds: new Set<string>(),
  initialized: false
}));

/**
 * Initialize the selection with all released + simulatable skills.
 * No-ops if already initialized.
 */
export const initializeSkillSelection = () => {
  if (useSkillSelectionStore.getState().initialized) return;

  const baseSkills = getBaseSkillsToTest();
  const simulatable = skillsService.filterSimulatable(baseSkills);
  const released = new Set(simulatable.filter((id) => skillsService.isReleased(id)));

  useSkillSelectionStore.setState({
    selectedSkillIds: released,
    initialized: true
  });
};

/**
 * Reset selection to released skills activatable for the current race settings.
 */
export const resetSkillSelectionForRace = (releasedActivatableIds: Array<string>) => {
  useSkillSelectionStore.setState({
    selectedSkillIds: new Set(releasedActivatableIds),
    initialized: true
  });
};

export const setSelectedSkillIds = (ids: Set<string>) => {
  useSkillSelectionStore.setState({ selectedSkillIds: ids });
};

export const toggleSkillSelected = (skillId: string) => {
  useSkillSelectionStore.setState((state) => {
    const next = new Set(state.selectedSkillIds);

    if (next.has(skillId)) {
      next.delete(skillId);
    } else {
      next.add(skillId);
    }

    return { selectedSkillIds: next };
  });
};

export const selectAllSkills = (skillIds: Array<string>) => {
  useSkillSelectionStore.setState((state) => {
    const next = new Set(state.selectedSkillIds);

    for (const id of skillIds) {
      next.add(id);
    }

    return { selectedSkillIds: next };
  });
};

export const deselectAllSkills = (skillIds: Array<string>) => {
  useSkillSelectionStore.setState((state) => {
    const next = new Set(state.selectedSkillIds);

    for (const id of skillIds) {
      next.delete(id);
    }

    return { selectedSkillIds: next };
  });
};

/**
 * Preset: select only released skills.
 */
export const selectReleasedOnly = () => {
  const baseSkills = getBaseSkillsToTest();
  const simulatable = skillsService.filterSimulatable(baseSkills);
  const released = new Set(simulatable.filter((id) => skillsService.isReleased(id)));

  useSkillSelectionStore.setState({ selectedSkillIds: released });
};

/**
 * Preset: select all simulatable skills (released + upcoming).
 */
export const selectAll = () => {
  const baseSkills = getBaseSkillsToTest();
  const simulatable = new Set(skillsService.filterSimulatable(baseSkills));

  useSkillSelectionStore.setState({ selectedSkillIds: simulatable });
};

/**
 * Preset: select only upcoming (unreleased) skills.
 */
export const selectUpcomingOnly = () => {
  const baseSkills = getBaseSkillsToTest();
  const simulatable = skillsService.filterSimulatable(baseSkills);
  const upcoming = new Set(simulatable.filter((id) => !skillsService.isReleased(id)));

  useSkillSelectionStore.setState({ selectedSkillIds: upcoming });
};

/**
 * Preset: clear all selections.
 */
export const clearSelection = () => {
  useSkillSelectionStore.setState({ selectedSkillIds: new Set() });
};
