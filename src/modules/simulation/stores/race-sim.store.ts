import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { RaceSimResult } from '@/lib/sunday-tools/race-sim/run-race-sim';
import { Mood } from '@/lib/sunday-tools/runner/definitions';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { generateSeed } from '@/utils/crypto';

const RACE_SIM_STORE_NAME = 'umalator-race-sim';
const MIN_NSAMPLES = 1;
const MAX_NSAMPLES = 10;

type IRaceSimStore = {
  runners: RunnerState[];
  nsamples: number;
  seed: number | null;
  results: RaceSimResult | null;
  isRunning: boolean;
  focusRunnerIndices: number[];
  isStale: boolean;
  zoomWindowMeters: number;
};

const DEFAULT_FIELD_STRATEGIES: Array<RunnerState['strategy']> = [
  'Front Runner',
  'Pace Chaser',
  'End Closer',
  'Late Surger',
  'Pace Chaser',
  'Pace Chaser',
  'Late Surger',
  'Front Runner',
  'End Closer',
];

const createDefaultRunner = (strategy: RunnerState['strategy']): RunnerState => ({
  outfitId: '',
  speed: 800,
  stamina: 800,
  power: 800,
  guts: 800,
  wisdom: 800,
  strategy,
  distanceAptitude: 'A',
  surfaceAptitude: 'A',
  strategyAptitude: 'A',
  mood: Mood.Normal,
  skills: [],
  randomMobId: Math.floor(Math.random() * 624) + 8000,
});

export const generateDefaultFieldAsRunnerState = (): RunnerState[] => {
  return DEFAULT_FIELD_STRATEGIES.map((strategy) => createDefaultRunner(strategy));
};

const normalizeNsamples = (nsamples: number): number => {
  const rounded = Math.round(nsamples);
  return Math.min(MAX_NSAMPLES, Math.max(MIN_NSAMPLES, rounded));
};

const applyFocusRunnerSuggestion = (
  runners: RunnerState[],
  focusRunnerIndices: number[],
): number[] => {
  const selectedRunnerIndices = runners.reduce<Array<number>>((indices, runner, index) => {
    if (runner.outfitId) {
      indices.push(index);
    }
    return indices;
  }, []);

  if (selectedRunnerIndices.length !== 1) {
    return focusRunnerIndices;
  }

  const suggestedRunner = selectedRunnerIndices[0];
  if (focusRunnerIndices.includes(suggestedRunner)) {
    return focusRunnerIndices;
  }

  return [...focusRunnerIndices, suggestedRunner];
};

export const useRaceSimStore = create<IRaceSimStore>()(
  persist(
    (_) => ({
      runners: generateDefaultFieldAsRunnerState(),
      nsamples: MIN_NSAMPLES,
      seed: null,
      results: null,
      isRunning: false,
      focusRunnerIndices: [],
      isStale: false,
      zoomWindowMeters: 300,
    }),
    {
      name: RACE_SIM_STORE_NAME,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        runners: state.runners,
        nsamples: state.nsamples,
        focusRunnerIndices: state.focusRunnerIndices,
        zoomWindowMeters: state.zoomWindowMeters,
      }),
    },
  ),
);

export const updateRunner = (index: number, partial: Partial<RunnerState>) => {
  useRaceSimStore.setState((state) => {
    if (index < 0 || index >= state.runners.length) {
      return state;
    }

    const nextRunners = [...state.runners];
    nextRunners[index] = { ...nextRunners[index], ...partial };

    return {
      runners: nextRunners,
      focusRunnerIndices: applyFocusRunnerSuggestion(nextRunners, state.focusRunnerIndices),
      isStale: true,
    };
  });
};

export const randomizeField = () => {
  useRaceSimStore.setState({
    runners: generateDefaultFieldAsRunnerState(),
    focusRunnerIndices: [],
    isStale: true,
  });
};

export const toggleFocusRunner = (index: number) => {
  useRaceSimStore.setState((state) => {
    const isFocused = state.focusRunnerIndices.includes(index);
    return {
      focusRunnerIndices: isFocused
        ? state.focusRunnerIndices.filter((runnerIndex) => runnerIndex !== index)
        : [...state.focusRunnerIndices, index],
    };
  });
};

export const setNsamples = (nsamples: number) => {
  useRaceSimStore.setState({
    nsamples: normalizeNsamples(nsamples),
    isStale: true,
  });
};

export const createNewSeed = () => {
  const seed = generateSeed();
  useRaceSimStore.setState({ seed });
  return seed;
};

export const setSeed = (seed: number | null) => {
  useRaceSimStore.setState({ seed });
};

export const setResults = (results: RaceSimResult) => {
  useRaceSimStore.setState({
    results,
    isStale: false,
  });
};

export const setIsRunning = (isRunning: boolean) => {
  useRaceSimStore.setState({ isRunning });
};

export const clearResults = () => {
  useRaceSimStore.setState({
    results: null,
    isStale: false,
  });
};

const MIN_ZOOM_WINDOW = 100;
const MAX_ZOOM_WINDOW = 1000;
const ZOOM_STEP = 100;

export const setZoomWindowMeters = (meters: number) => {
  const clamped = Math.round(meters / ZOOM_STEP) * ZOOM_STEP;
  useRaceSimStore.setState({
    zoomWindowMeters: Math.min(MAX_ZOOM_WINDOW, Math.max(MIN_ZOOM_WINDOW, clamped)),
  });
};
