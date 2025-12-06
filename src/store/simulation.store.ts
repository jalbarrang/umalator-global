import { create } from 'zustand';
import {
  CompareResult,
  FirstUMAStats,
  SimulationData,
  SimulationRun,
  StaminaStats,
  Stats,
} from './race/compare.types';
import { SpurtCandidate } from '@simulation/lib/SpurtCalculator';

export interface ChartTableEntry {
  id: string;
  results: number[];
  runData: SimulationData | null;
  min: number;
  max: number;
  mean: number;
  median: number;
  sampleCount?: number; // Track actual sample count when results array is truncated
}

export interface ChartStats {
  startTime: number | null;
  endTime: number | null;
  skillCount: number;
  totalSamples: number;
}

interface ComparisonState {
  results: number[];
  runData: SimulationData;
  chartData: SimulationRun;
  rushedStats: Stats;
  leadCompetitionStats: Stats;
  spurtInfo: SpurtCandidate;
  staminaStats: StaminaStats;
  firstUmaStats: FirstUMAStats;
}

interface SkillChartState {
  tableData: Map<string, ChartTableEntry>;
  selectedSkillId: string | null;
  chartStats: ChartStats;
}

type ISimulationStore = {
  displaying: string;
  comparison: ComparisonState | null;
  skillChart: SkillChartState | null;
  popoverSkill: string;
};

export const useSimulationStore = create<ISimulationStore>()(() => ({
  displaying: 'meanrun',
  comparison: null,
  skillChart: null,
  popoverSkill: '',
}));

// Comparison mode actions
export const setComparisonResults = (results: CompareResult) => {
  const { displaying = 'meanrun' } = useSimulationStore.getState();

  useSimulationStore.setState({
    comparison: {
      results: results.results,
      runData: results.runData,
      chartData: results.runData[displaying],
      rushedStats: results.rushedStats,
      leadCompetitionStats: results.leadCompetitionStats,
      spurtInfo: results.spurtInfo,
      staminaStats: results.staminaStats,
      firstUmaStats: results.firstUmaStats,
    },
    displaying,
  });
};

// Skill chart mode actions
export const startChartTimer = (skillCount: number) => {
  const { skillChart } = useSimulationStore.getState();

  useSimulationStore.setState({
    skillChart: {
      tableData: skillChart?.tableData ?? new Map(),
      selectedSkillId: skillChart?.selectedSkillId ?? null,
      chartStats: {
        startTime: performance.now(),
        endTime: null,
        skillCount,
        totalSamples: 0,
      },
    },
  });
};

export const stopChartTimer = () => {
  const { skillChart } = useSimulationStore.getState();
  if (!skillChart) return;

  // Calculate total samples from all entries
  let totalSamples = 0;
  skillChart.tableData.forEach((entry) => {
    totalSamples += entry.sampleCount ?? entry.results.length;
  });

  useSimulationStore.setState({
    skillChart: {
      ...skillChart,
      chartStats: {
        ...skillChart.chartStats,
        endTime: performance.now(),
        totalSamples,
      },
    },
  });
};

/**
 * Explicitly cleanup table data to help garbage collection.
 * Clears all arrays and references in the current table data.
 */
export const cleanupTableData = () => {
  const { skillChart } = useSimulationStore.getState();
  if (!skillChart) return;

  // Clear arrays within each entry to help GC
  skillChart.tableData.forEach((entry) => {
    if (entry.results) {
      entry.results.length = 0;
    }
    entry.runData = null;
  });

  // Clear the map itself
  skillChart.tableData.clear();
};

export const resetTableData = () => {
  // Clean up old data first to help GC
  cleanupTableData();

  const { skillChart } = useSimulationStore.getState();

  useSimulationStore.setState({
    skillChart: {
      tableData: new Map(),
      selectedSkillId: null,
      chartStats: skillChart?.chartStats ?? {
        startTime: null,
        endTime: null,
        skillCount: 0,
        totalSamples: 0,
      },
    },
  });
};

export const updateTableData = (newData: Map<string, ChartTableEntry>) => {
  const { skillChart } = useSimulationStore.getState();

  const tableData = skillChart?.tableData ?? new Map();
  const merged = new Map(tableData);

  newData.forEach((v, k) => merged.set(k, v));

  useSimulationStore.setState({
    skillChart: {
      tableData: merged,
      selectedSkillId: skillChart?.selectedSkillId ?? null,
      chartStats: skillChart?.chartStats ?? {
        startTime: null,
        endTime: null,
        skillCount: 0,
        totalSamples: 0,
      },
    },
  });
};

// Mode-aware display type switching
export const setDisplaying = (displaying: string = 'meanrun') => {
  const { comparison, skillChart } = useSimulationStore.getState();

  // If in comparison mode, update chartData
  if (comparison?.runData) {
    useSimulationStore.setState({
      displaying,
      comparison: {
        ...comparison,
        chartData: comparison.runData[displaying],
      },
    });
    return;
  }

  // If in skill mode with a selected skill, update chartData
  if (skillChart?.selectedSkillId) {
    const selectedSkill = skillChart.tableData.get(skillChart.selectedSkillId);
    if (selectedSkill?.runData) {
      useSimulationStore.setState({
        displaying,
        comparison: {
          results: selectedSkill.results,
          runData: selectedSkill.runData,
          chartData: selectedSkill.runData[displaying],
          rushedStats: null,
          leadCompetitionStats: null,
          spurtInfo: null,
          staminaStats: null,
          firstUmaStats: null,
        },
      });
      return;
    }
  }

  // Otherwise, just update the preference
  useSimulationStore.setState({ displaying });
};

// Skill selection
export const selectSkill = (skillId: string) => {
  const { skillChart, displaying } = useSimulationStore.getState();
  if (!skillChart) return;

  const simulatedData = skillChart.tableData.get(skillId);

  if (simulatedData?.runData) {
    useSimulationStore.setState({
      skillChart: {
        ...skillChart,
        selectedSkillId: skillId,
      },
      comparison: {
        results: simulatedData.results,
        runData: simulatedData.runData,
        chartData: simulatedData.runData[displaying],
        rushedStats: null,
        leadCompetitionStats: null,
        spurtInfo: null,
        staminaStats: null,
        firstUmaStats: null,
      },
    });
  }
};

// UI state
export const setPopoverSkill = (skillId: string) => {
  useSimulationStore.setState({ popoverSkill: skillId });
};

// Reset simulation
export const resetSimulation = () => {
  cleanupTableData();
  useSimulationStore.setState({
    displaying: 'meanrun',
    comparison: null,
    skillChart: null,
    popoverSkill: '',
  });
};

// Backward compatibility exports for legacy names
export { setComparisonResults as setResults };
export { selectSkill as basinnChartSelection };

