import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import type {
  CompareResult,
  FirstUMAStats,
  SimulationData,
  SimulationRun,
  StaminaStats,
  Stats,
} from '@/modules/simulation/compare.types';
import type { InjectedDebuffsMap } from '@/modules/simulation/types';
import { generateSeed } from '@/utils/crypto';
import { SpurtCandidate } from '@/lib/sunday-tools/common/spurt-calculator';

const COMPARE_DEBUFFS_STORE_NAME = 'umalator-compare-debuffs';
export type CompareRunnerId = 'uma1' | 'uma2';

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
  injectedDebuffs: InjectedDebuffsMap;
};

export const useRaceStore = create<IRaceStore>()(
  persist(
    (_) => ({
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
      injectedDebuffs: { uma1: [], uma2: [] },
    }),
    {
      name: COMPARE_DEBUFFS_STORE_NAME,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        injectedDebuffs: state.injectedDebuffs,
      }),
    },
  ),
);

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

export const addDebuff = (runnerId: CompareRunnerId, skillId: string, position: number) => {
  useRaceStore.setState((state) => ({
    injectedDebuffs: {
      ...state.injectedDebuffs,
      [runnerId]: [
        ...state.injectedDebuffs[runnerId],
        { id: crypto.randomUUID(), skillId, position: Math.round(position) },
      ],
    },
  }));
};

export const removeDebuff = (runnerId: CompareRunnerId, debuffId: string) => {
  useRaceStore.setState((state) => ({
    injectedDebuffs: {
      ...state.injectedDebuffs,
      [runnerId]: state.injectedDebuffs[runnerId].filter((debuff) => debuff.id !== debuffId),
    },
  }));
};

export const updateDebuffPosition = (
  runnerId: CompareRunnerId,
  debuffId: string,
  position: number,
) => {
  useRaceStore.setState((state) => ({
    injectedDebuffs: {
      ...state.injectedDebuffs,
      [runnerId]: state.injectedDebuffs[runnerId].map((debuff) => {
        if (debuff.id !== debuffId) {
          return debuff;
        }
        return { ...debuff, position: Math.round(position) };
      }),
    },
  }));
};

export const clearAllDebuffs = () => {
  useRaceStore.setState({ injectedDebuffs: { uma1: [], uma2: [] } });
};

export const useDebuffs = (): InjectedDebuffsMap => {
  return useRaceStore(
    useShallow((state) => ({
      uma1: state.injectedDebuffs.uma1,
      uma2: state.injectedDebuffs.uma2,
    })),
  );
};
