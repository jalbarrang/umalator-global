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
          name: 'Cancer Cup',
          type: EventType.CM,
          date: '2025-10',
          courseId: 10602,
          season: Season.Summer,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '2025-09': {
          name: 'Leo Cup',
          type: EventType.CM,
          date: '2025-09',
          courseId: 10811,
          season: Season.Spring,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '2025-08': {
          name: 'Virgo Cup',
          type: EventType.CM,
          date: '2025-08',
          courseId: 10606,
          season: Season.Spring,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '2025-12-08': {
          name: 'Libra Cup',
          type: EventType.CM,
          date: '2025-12-08',
          courseId: 10810,
          season: Season.Autumn,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '2025-12-28': {
          name: 'Scorpio Cup',
          type: EventType.CM,
          date: '2025-12-28',
          courseId: 10604,
          season: Season.Autumn,
          ground: GroundCondition.Soft,
          weather: Weather.Rainy,
          time: Time.Midday,
        },
        '2026-01-17': {
          name: 'Sagittarius Cup',
          type: EventType.CM,
          date: '2026-01-17',
          courseId: 10506,
          season: Season.Winter,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '2026-02-09': {
          name: 'Capricorn Cup',
          type: EventType.CM,
          date: '2026-02-09',
          courseId: 10701,
          season: Season.Winter,
          ground: GroundCondition.Soft,
          weather: Weather.Snowy,
          time: Time.Midday,
        },
        '2026-03-01': {
          name: 'Aquarius Cup',
          type: EventType.CM,
          date: '2026-03-01',
          courseId: 10611,
          season: Season.Winter,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '2026-03-24': {
          name: 'Pisces Cup',
          type: EventType.CM,
          date: '2026-03-24',
          courseId: 10914,
          season: Season.Spring,
          ground: GroundCondition.Heavy,
          weather: Weather.Rainy,
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
