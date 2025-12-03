import { create } from 'zustand';
import { useRaceStore } from './race/store';

type IChartStore = {
  tableData: Map<string, any>;
  popoverSkill: string;
};

export const useChartStore = create<IChartStore>()(() => ({
  tableData: new Map(),
  popoverSkill: '',
}));

export const updateTableData = (newData: Map<string, any> | 'reset') => {
  if (newData === 'reset') {
    useChartStore.setState({ tableData: new Map() });
    return;
  }

  const { tableData } = useChartStore.getState();
  const merged = new Map(tableData);
  newData.forEach((v, k) => merged.set(k, v));

  useChartStore.setState({ tableData: merged });
};

export const setPopoverSkill = (skillId: string) => {
  window.dispatchEvent(new CustomEvent('showPopover', { detail: { skillId } }));
  useChartStore.setState({ popoverSkill: skillId });
};

export const basinnChartSelection = (skillId: string) => {
  const { tableData } = useChartStore.getState();
  const results = tableData.get(skillId);

  if (results?.runData) {
    useRaceStore.setState({ results: results });
  }
};
