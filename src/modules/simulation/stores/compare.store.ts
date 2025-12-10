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

export const initialChartData: SimulationRun = {
  t: [[], []],
  p: [[], []],
  v: [[], []],
  hp: [[], []],
  currentLane: [[], []],
  pacerGap: [[], []],
  sk: [new Map(), new Map()],
  debuffsReceived: [new Map(), new Map()],
  sdly: [0, 0],
  rushed: [[], []],
  posKeep: [[], []],
  competeFight: [[], []],
  leadCompetition: [[], []],
  pacerV: [[], [], []],
  pacerP: [[], [], []],
  pacerT: [[], [], []],
  pacerPosKeep: [[], [], []],
  pacerLeadCompetition: [[], [], []],
};

type IRaceStore = {
  results: number[];
  runData: SimulationData | null;
  chartData: SimulationRun | null;
  displaying: string;
  rushedStats: Stats | null;
  leadCompetitionStats: Stats | null;
  spurtInfo: SpurtCandidate | null;
  staminaStats: StaminaStats | null;
  firstUmaStats: FirstUMAStats | null;
};

export const useRaceStore = create<IRaceStore>()((_) => ({
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
