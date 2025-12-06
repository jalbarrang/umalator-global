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
import { Mode } from '@/utils/settings';

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
  popoverSkill: string;

  // Per-mode data storage
  compareResults: ComparisonState | null;
  skillChartResults: SkillChartState | null;
  uniquesChartResults: SkillChartState | null;

  // Track which chart mode is currently active (for worker results)
  activeChartMode: Mode.Chart | Mode.UniquesChart;

  // Legacy accessors - these are computed based on current mode
  // Components should use the mode-aware selectors below
  comparison: ComparisonState | null;
  skillChart: SkillChartState | null;
};

export const useSimulationStore = create<ISimulationStore>()(() => ({
  displaying: 'meanrun',
  popoverSkill: '',

  // Per-mode storage
  compareResults: null,
  skillChartResults: null,
  uniquesChartResults: null,

  // Default active chart mode
  activeChartMode: Mode.Chart,

  // Legacy computed accessors (updated by actions)
  comparison: null,
  skillChart: null,
}));

// Helper to get the correct chart state based on mode
const getChartStateForMode = (
  mode: Mode.Chart | Mode.UniquesChart,
): SkillChartState | null => {
  const state = useSimulationStore.getState();
  return mode === Mode.UniquesChart
    ? state.uniquesChartResults
    : state.skillChartResults;
};

// Helper to set chart state for a specific mode
const setChartStateForMode = (
  mode: Mode.Chart | Mode.UniquesChart,
  chartState: SkillChartState | null,
) => {
  if (mode === Mode.UniquesChart) {
    useSimulationStore.setState({
      uniquesChartResults: chartState,
      skillChart: chartState,
    });
  } else {
    useSimulationStore.setState({
      skillChartResults: chartState,
      skillChart: chartState,
    });
  }
};

// Set active chart mode (called when starting chart simulations)
export const setActiveChartMode = (mode: Mode.Chart | Mode.UniquesChart) => {
  const chartState = getChartStateForMode(mode);
  useSimulationStore.setState({
    activeChartMode: mode,
    skillChart: chartState,
  });
};

// Switch mode view (called when mode toggle changes)
export const switchToMode = (mode: Mode) => {
  const state = useSimulationStore.getState();

  if (mode === Mode.Compare) {
    useSimulationStore.setState({
      comparison: state.compareResults,
      skillChart: null,
    });
  } else if (mode === Mode.Chart) {
    useSimulationStore.setState({
      comparison: null,
      skillChart: state.skillChartResults,
    });
  } else if (mode === Mode.UniquesChart) {
    useSimulationStore.setState({
      comparison: null,
      skillChart: state.uniquesChartResults,
    });
  }
};

// Comparison mode actions
export const setComparisonResults = (results: CompareResult) => {
  const { displaying = 'meanrun' } = useSimulationStore.getState();

  const comparisonState: ComparisonState = {
    results: results.results,
    runData: results.runData,
    chartData: results.runData[displaying],
    rushedStats: results.rushedStats,
    leadCompetitionStats: results.leadCompetitionStats,
    spurtInfo: results.spurtInfo,
    staminaStats: results.staminaStats,
    firstUmaStats: results.firstUmaStats,
  };

  useSimulationStore.setState({
    compareResults: comparisonState,
    comparison: comparisonState,
    displaying,
  });
};

// Skill chart mode actions
export const startChartTimer = (skillCount: number, mode?: Mode) => {
  const state = useSimulationStore.getState();
  const chartMode =
    mode === Mode.Chart || mode === Mode.UniquesChart
      ? mode
      : state.activeChartMode;

  const existingChart = getChartStateForMode(chartMode);

  const newChartState: SkillChartState = {
    tableData: existingChart?.tableData ?? new Map(),
    selectedSkillId: existingChart?.selectedSkillId ?? null,
    chartStats: {
      startTime: performance.now(),
      endTime: null,
      skillCount,
      totalSamples: 0,
    },
  };

  setChartStateForMode(chartMode, newChartState);
  useSimulationStore.setState({ activeChartMode: chartMode });
};

export const stopChartTimer = () => {
  const state = useSimulationStore.getState();
  const chartState = getChartStateForMode(state.activeChartMode);
  if (!chartState) return;

  // Calculate total samples from all entries
  let totalSamples = 0;
  chartState.tableData.forEach((entry) => {
    totalSamples += entry.sampleCount ?? entry.results.length;
  });

  const newChartState: SkillChartState = {
    ...chartState,
    chartStats: {
      ...chartState.chartStats,
      endTime: performance.now(),
      totalSamples,
    },
  };

  setChartStateForMode(state.activeChartMode, newChartState);
};

/**
 * Explicitly cleanup table data to help garbage collection.
 * Clears all arrays and references in the specified mode's table data.
 */
export const cleanupTableData = (mode?: Mode) => {
  const state = useSimulationStore.getState();
  const chartMode =
    mode === Mode.Chart || mode === Mode.UniquesChart
      ? mode
      : state.activeChartMode;

  const chartState = getChartStateForMode(chartMode);
  if (!chartState) return;

  // Clear arrays within each entry to help GC
  chartState.tableData.forEach((entry) => {
    if (entry.results) {
      entry.results.length = 0;
    }
    entry.runData = null;
  });

  // Clear the map itself
  chartState.tableData.clear();
};

export const resetTableData = (mode?: Mode) => {
  const state = useSimulationStore.getState();
  const chartMode =
    mode === Mode.Chart || mode === Mode.UniquesChart
      ? mode
      : state.activeChartMode;

  // Clean up old data first to help GC
  cleanupTableData(chartMode);

  const existingChart = getChartStateForMode(chartMode);

  const newChartState: SkillChartState = {
    tableData: new Map(),
    selectedSkillId: null,
    chartStats: existingChart?.chartStats ?? {
      startTime: null,
      endTime: null,
      skillCount: 0,
      totalSamples: 0,
    },
  };

  setChartStateForMode(chartMode, newChartState);
  useSimulationStore.setState({ activeChartMode: chartMode });
};

export const updateTableData = (newData: Map<string, ChartTableEntry>) => {
  const state = useSimulationStore.getState();
  const chartState = getChartStateForMode(state.activeChartMode);

  const tableData = chartState?.tableData ?? new Map();
  const merged = new Map(tableData);

  newData.forEach((v, k) => merged.set(k, v));

  const newChartState: SkillChartState = {
    tableData: merged,
    selectedSkillId: chartState?.selectedSkillId ?? null,
    chartStats: chartState?.chartStats ?? {
      startTime: null,
      endTime: null,
      skillCount: 0,
      totalSamples: 0,
    },
  };

  setChartStateForMode(state.activeChartMode, newChartState);
};

// Mode-aware display type switching
export const setDisplaying = (displaying: string = 'meanrun') => {
  const { comparison, skillChart } = useSimulationStore.getState();

  // If in comparison mode, update chartData
  if (comparison?.runData) {
    const updatedComparison = {
      ...comparison,
      chartData: comparison.runData[displaying],
    };
    useSimulationStore.setState({
      displaying,
      comparison: updatedComparison,
      compareResults: updatedComparison,
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
  const state = useSimulationStore.getState();
  const chartState = getChartStateForMode(state.activeChartMode);
  if (!chartState) return;

  const simulatedData = chartState.tableData.get(skillId);

  if (simulatedData?.runData) {
    const newChartState: SkillChartState = {
      ...chartState,
      selectedSkillId: skillId,
    };

    setChartStateForMode(state.activeChartMode, newChartState);

    useSimulationStore.setState({
      comparison: {
        results: simulatedData.results,
        runData: simulatedData.runData,
        chartData: simulatedData.runData[state.displaying],
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

// Reset simulation for current mode only
export const resetSimulation = () => {
  cleanupTableData();
  useSimulationStore.setState({
    displaying: 'meanrun',
    comparison: null,
    skillChart: null,
    popoverSkill: '',
  });
};

// Reset all simulation data across all modes
export const resetAllSimulations = () => {
  // Cleanup all chart data
  const state = useSimulationStore.getState();

  if (state.skillChartResults) {
    state.skillChartResults.tableData.forEach((entry) => {
      if (entry.results) entry.results.length = 0;
      entry.runData = null;
    });
    state.skillChartResults.tableData.clear();
  }

  if (state.uniquesChartResults) {
    state.uniquesChartResults.tableData.forEach((entry) => {
      if (entry.results) entry.results.length = 0;
      entry.runData = null;
    });
    state.uniquesChartResults.tableData.clear();
  }

  useSimulationStore.setState({
    displaying: 'meanrun',
    popoverSkill: '',
    compareResults: null,
    skillChartResults: null,
    uniquesChartResults: null,
    comparison: null,
    skillChart: null,
  });
};

// Backward compatibility exports for legacy names
export { setComparisonResults as setResults };
export { selectSkill as basinnChartSelection };
