import { useMemo } from 'react';
import { useRunnersStore } from '../runners.store';
import { useSettingsStore } from '../settings.store';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { useShallow } from 'zustand/shallow';

// Convert boolean array to indices array
export const getSelectedPacemakerIndices = (): number[] => {
  const { selectedPacemakers } = useSettingsStore.getState();

  return selectedPacemakers
    .map((selected, index) => (selected ? index : -1))
    .filter((index) => index !== -1);
};

export const useSelectedPacemakerIndices = (): number[] => {
  const selectedPacemakers = useSettingsStore(
    useShallow((state) => state.selectedPacemakers),
  );

  return useMemo(() => {
    return selectedPacemakers
      .map((selected, index) => (selected ? index : -1))
      .filter((index) => index !== -1);
  }, [selectedPacemakers]);
};

// Convert indices array to boolean array
export const setSelectedPacemakerIndices = (indices: number[]) => {
  const selectedPacemakers = [false, false, false];

  indices.forEach((index) => {
    if (index >= 0 && index < 3) {
      selectedPacemakers[index] = true;
    }
  });

  useSettingsStore.setState({ selectedPacemakers });
};

// Toggle a single pacemaker selection
export const togglePacemakerSelection = (index: number) => {
  const { selectedPacemakers } = useSettingsStore.getState();
  const newSelection = [...selectedPacemakers];
  newSelection[index] = !newSelection[index];
  useSettingsStore.setState({ selectedPacemakers: newSelection });
};

export const togglePaceMakers = (indices: number[]) => {
  console.log('togglePaceMakers', indices);

  const { selectedPacemakers } = useSettingsStore.getState();
  const newSelection = [...selectedPacemakers];

  indices.forEach((index) => {
    newSelection[index] = !newSelection[index];
  });

  useSettingsStore.setState({ selectedPacemakers: newSelection });
};

// Update pacemaker count and clean up invalid selections
export const setPacemakerCount = (count: number) => {
  const { selectedPacemakers } = useSettingsStore.getState();
  const newSelection = selectedPacemakers.slice(0, count);

  // Fill remaining with false if count increased
  while (newSelection.length < 3) {
    newSelection.push(false);
  }

  useSettingsStore.setState({
    pacemakerCount: count,
    selectedPacemakers: newSelection,
  });
};

export const getSelectedPacemakersAsArray = (): boolean[] => {
  const result = [false, false, false];
  const indices = getSelectedPacemakerIndices();

  indices.forEach((index) => {
    if (index >= 0 && index < 3) {
      result[index] = true;
    }
  });

  return result;
};

export const useSelectedPacemakers = (): RunnerState[] => {
  const { uma1, uma2, pacer } = useRunnersStore();
  const selectedPacemakers = useSelectedPacemakerIndices();

  return useMemo(() => {
    return [uma1, uma2, pacer].filter((_, index) => selectedPacemakers[index]);
  }, [uma1, uma2, pacer, selectedPacemakers]);
};

export const useSelectedPacemakerBooleans = (): boolean[] => {
  const { selectedPacemakers } = useSettingsStore();

  return useMemo(() => {
    const result = [false, false, false];

    const indices = selectedPacemakers
      .map((selected, index) => (selected ? index : -1))
      .filter((index) => index !== -1);

    indices.forEach((index) => {
      if (index >= 0 && index < 3) {
        result[index] = true;
      }
    });

    return result;
  }, [selectedPacemakers]);
};
