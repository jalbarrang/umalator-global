import { EventType, RacePreset } from '@/utils/races';
import {
  GroundCondition,
  Season,
  Time,
  Weather,
} from '@simulation/lib/RaceParameters';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const PRESET_STORE_NAME = 'umalator-presets';

type IPresetStore = {
  presets: Record<string, RacePreset>;
};

export const usePresetStore = create<IPresetStore>()(
  persist(
    (_) => ({
      presets: {
        '2025-10': {
          type: EventType.CM,
          date: '2025-10',
          courseId: 10602,
          season: Season.Summer,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '2025-09': {
          type: EventType.CM,
          date: '2025-09',
          courseId: 10811,
          season: Season.Spring,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '2025-08': {
          type: EventType.CM,
          date: '2025-08',
          courseId: 10606,
          season: Season.Spring,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
      },
    }),
    {
      name: PRESET_STORE_NAME,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const addPreset = (preset: RacePreset) => {
  usePresetStore.setState((state) => ({
    presets: { ...state.presets, [preset.date]: preset },
  }));
};
