import { create } from 'zustand';
import {
  createRunnerState,
  RunnerState,
} from '@/modules/runners/components/runner-card/types';
import {
  DEFAULT_COURSE_ID,
  DEFAULT_SAMPLES,
  DEFAULT_SEED,
} from '@/utils/constants';
import { createRaceConditions, RaceConditions } from '@/utils/races';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { createJSONStorage, persist } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { setCurrentIdx, useUIStore } from './ui.store';

export type WitVarianceSettings = {
  allowRushedUma1: boolean;
  allowRushedUma2: boolean;
  allowDownhillUma1: boolean;
  allowDownhillUma2: boolean;
  allowSectionModifierUma1: boolean;
  allowSectionModifierUma2: boolean;
  allowSkillCheckChanceUma1: boolean;
  allowSkillCheckChanceUma2: boolean;
  simWitVariance: boolean;
};

type ISettingsStore = {
  courseId: number;
  nsamples: number;
  seed: number;
  posKeepMode: PosKeepMode;
  racedef: RaceConditions;
  uma1: RunnerState;
  uma2: RunnerState;
  pacer: RunnerState;
  showVirtualPacemakerOnGraph: boolean;
  pacemakerCount: number;
  selectedPacemakers: boolean[];
  witVarianceSettings: WitVarianceSettings;

  // UI settings
  showLanes: boolean;
  showHp: boolean;
};

export const useSettingsStore = create<ISettingsStore>()(
  persist(
    (_) => ({
      courseId: DEFAULT_COURSE_ID,
      nsamples: DEFAULT_SAMPLES,
      seed: DEFAULT_SEED,
      posKeepMode: PosKeepMode.Approximate,
      racedef: createRaceConditions(),
      uma1: createRunnerState(),
      uma2: createRunnerState(),
      pacer: createRunnerState({ strategy: 'Nige' }),
      witVarianceSettings: {
        allowRushedUma1: true,
        allowRushedUma2: true,
        allowDownhillUma1: true,
        allowDownhillUma2: true,
        allowSectionModifierUma1: true,
        allowSectionModifierUma2: true,
        allowSkillCheckChanceUma1: true,
        allowSkillCheckChanceUma2: true,
        simWitVariance: false,
      },
      showVirtualPacemakerOnGraph: false,
      pacemakerCount: 1,
      selectedPacemakers: [false, false, false],
      showLanes: false,
      showHp: false,
    }),
    {
      name: 'umalator-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const useWitVariance = () =>
  useSettingsStore(useShallow((state) => state.witVarianceSettings));

export const getWitVariance = () =>
  useSettingsStore.getState().witVarianceSettings;

export const setWitVariance = (
  witVarianceSettings: Partial<WitVarianceSettings>,
) => {
  useSettingsStore.setState((state) => ({
    witVarianceSettings: {
      ...state.witVarianceSettings,
      ...witVarianceSettings,
    },
  }));
};

export const setSamples = (samples: number) => {
  useSettingsStore.setState({ nsamples: samples });
};

export const setSeed = (seed: number) => {
  useSettingsStore.setState({ seed });
};

export const setPosKeepMode = (posKeepMode: PosKeepMode) => {
  const { currentIdx } = useUIStore.getState();
  useSettingsStore.setState({ posKeepMode });

  if (posKeepMode !== PosKeepMode.Virtual && currentIdx === 2) {
    setCurrentIdx(0);
  }
};

export const toggleShowLanes = () => {
  useSettingsStore.setState((state) => ({ showLanes: !state.showLanes }));
};

export const toggleShowHp = () => {
  useSettingsStore.setState((state) => ({ showHp: !state.showHp }));
};

export const setRaceParams = (raceParams: RaceConditions) => {
  useSettingsStore.setState({ racedef: raceParams });
};

export const setCourseId = (courseId: number) => {
  useSettingsStore.setState({ courseId });
};
