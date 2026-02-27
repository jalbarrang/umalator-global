import { create } from 'zustand';
import type {
  CompareResult,
  FirstUMAStats,
  SimulationData,
  SimulationRun,
  StaminaStats,
  Stats,
} from '@/modules/simulation/compare.types';
import { generateSeed } from '@/utils/crypto';
import { SpurtCandidate } from '@/lib/sunday-tools/common/spurt-calculator';

type IRaceStore = {
  seed: number | null;
  results: Array<number>;
  runData: SimulationData | null;
  chartData: SimulationRun | null;
  displaying: string;
  rushedStats: Stats | null;
  leadCompetitionStats: Stats | null;
  spurtInfo: SpurtCandidate | null;
  staminaStats: StaminaStats | null;
  firstUmaStats: FirstUMAStats | null;
  isSimulationRunning: boolean;
  simulationProgress: { current: number; total: number } | null;
};

export const useRaceStore = create<IRaceStore>()((_) => ({
  seed: null,
  results: [],
  runData: null,
  chartData: null,
  displaying: 'meanrun',
  rushedStats: null,
  leadCompetitionStats: null,
  spurtInfo: null,
  staminaStats: null,
  firstUmaStats: null,
  isSimulationRunning: false,
  simulationProgress: null,
}));

export const setSeed = (seed: number | null) => {
  useRaceStore.setState({ seed });
};

export const createNewSeed = () => {
  const seed = generateSeed();
  useRaceStore.setState({ seed });

  return seed;
};

export const setResults = (results: CompareResult) => {
  const { displaying = 'meanrun' } = useRaceStore.getState();

  const currentRunData = results.runData[displaying as keyof SimulationData];

  useRaceStore.setState({
    results: results.results,
    runData: results.runData,
    chartData: currentRunData,
    displaying: displaying,
    rushedStats: results.rushedStats,
    leadCompetitionStats: results.leadCompetitionStats,
    spurtInfo: results.spurtInfo ?? undefined,
    staminaStats: results.staminaStats,
    firstUmaStats: results.firstUmaStats,
  });
};

export const setDisplaying = (displaying: string = 'meanrun') => {
  const { runData } = useRaceStore.getState();

  const currentRunData = runData?.[displaying as keyof SimulationData];

  useRaceStore.setState({
    displaying,
    chartData: currentRunData,
  });
};

export const resetResults = () => {
  useRaceStore.setState({
    results: [],
    runData: null,
    chartData: null,
    displaying: 'meanrun',
    rushedStats: null,
    leadCompetitionStats: null,
    spurtInfo: null,
    staminaStats: null,
    firstUmaStats: null,
    simulationProgress: null,
  });
};

export const setIsSimulationRunning = (isSimulationRunning: boolean) => {
  useRaceStore.setState({ isSimulationRunning });
};

export const setSimulationProgress = (progress: { current: number; total: number } | null) => {
  useRaceStore.setState({ simulationProgress: progress });
};
