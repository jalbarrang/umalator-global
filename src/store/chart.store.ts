import { create } from 'zustand';
import { useRaceStore } from './race/store';
import { SimulationData } from './race/compare.types';

export interface ChartTableEntry {
  id: string;
  results: number[];
  runData: SimulationData;
  min: number;
  max: number;
  mean: number;
  median: number;
}

type IChartStore = {
  tableData: Map<string, ChartTableEntry>;
  popoverSkill: string;
};

export const useChartStore = create<IChartStore>()(() => ({
  tableData: new Map(),
  popoverSkill: '',
}));

export const resetTableData = () => {
  useChartStore.setState({ tableData: new Map() });
};

export const updateTableData = (newData: Map<string, ChartTableEntry>) => {
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
  const simulatedData = tableData.get(skillId);

  if (simulatedData?.runData) {
    useRaceStore.setState({ results: simulatedData.results });
  }
};
