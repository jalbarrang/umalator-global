import { create } from 'zustand';
import {
  CompareResult,
  FirstUMAStats,
  SimulationData,
  SimulationRun,
  StaminaStats,
  Stats,
} from '@simulation/compare.types';
import { SpurtCandidate } from '@simulation/lib/SpurtCalculator';

type IRaceStore = {
  results: number[];
  runData: SimulationData;
  chartData: SimulationRun;
  displaying: string;
  rushedStats: Stats;
  leadCompetitionStats: Stats;
  spurtInfo: SpurtCandidate;
  staminaStats: StaminaStats;
  firstUmaStats: FirstUMAStats;
};

export const useRaceStore = create<IRaceStore>()(() => ({
  results: [],
  runData: null,
  chartData: null,
  displaying: 'meanrun',
  rushedStats: null,
  leadCompetitionStats: null,
  spurtInfo: null,
  staminaStats: null,
  firstUmaStats: null,
}));

export const setResults = (results: CompareResult) => {
  const { displaying = 'meanrun' } = useRaceStore.getState();

  useRaceStore.setState({
    results: results.results,
    runData: results.runData,
    chartData: results.runData[displaying],
    displaying: displaying,
    rushedStats: results.rushedStats,
    leadCompetitionStats: results.leadCompetitionStats,
    spurtInfo: results.spurtInfo,
    staminaStats: results.staminaStats,
    firstUmaStats: results.firstUmaStats,
  });
};

export const setDisplaying = (displaying: string = 'meanrun') => {
  const { runData } = useRaceStore.getState();

  useRaceStore.setState({
    displaying,
    chartData: runData[displaying],
  });
};
