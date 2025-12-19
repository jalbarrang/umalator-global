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
        '550e8400-e29b-41d4-a716-446655440001': {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Cancer Cup',
          type: EventType.CM,
          date: '2025-10',
          courseId: 10602,
          season: Season.Summer,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '550e8400-e29b-41d4-a716-446655440002': {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Leo Cup',
          type: EventType.CM,
          date: '2025-09',
          courseId: 10811,
          season: Season.Spring,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '550e8400-e29b-41d4-a716-446655440003': {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Virgo Cup',
          type: EventType.CM,
          date: '2025-08',
          courseId: 10606,
          season: Season.Spring,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '550e8400-e29b-41d4-a716-446655440004': {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'Libra Cup',
          type: EventType.CM,
          date: '2025-12-08',
          courseId: 10810,
          season: Season.Autumn,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '550e8400-e29b-41d4-a716-446655440005': {
          id: '550e8400-e29b-41d4-a716-446655440005',
          name: 'Scorpio Cup',
          type: EventType.CM,
          date: '2025-12-28',
          courseId: 10604,
          season: Season.Autumn,
          ground: GroundCondition.Soft,
          weather: Weather.Rainy,
          time: Time.Midday,
        },
        '550e8400-e29b-41d4-a716-446655440006': {
          id: '550e8400-e29b-41d4-a716-446655440006',
          name: 'Sagittarius Cup',
          type: EventType.CM,
          date: '2026-01-17',
          courseId: 10506,
          season: Season.Winter,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '550e8400-e29b-41d4-a716-446655440007': {
          id: '550e8400-e29b-41d4-a716-446655440007',
          name: 'Capricorn Cup',
          type: EventType.CM,
          date: '2026-02-09',
          courseId: 10701,
          season: Season.Winter,
          ground: GroundCondition.Soft,
          weather: Weather.Snowy,
          time: Time.Midday,
        },
        '550e8400-e29b-41d4-a716-446655440008': {
          id: '550e8400-e29b-41d4-a716-446655440008',
          name: 'Aquarius Cup',
          type: EventType.CM,
          date: '2026-03-01',
          courseId: 10611,
          season: Season.Winter,
          ground: GroundCondition.Good,
          weather: Weather.Sunny,
          time: Time.Midday,
        },
        '550e8400-e29b-41d4-a716-446655440009': {
          id: '550e8400-e29b-41d4-a716-446655440009',
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
    presets: { ...state.presets, [preset.id]: preset },
  }));
};

export const updatePreset = (id: string, preset: RacePreset) => {
  usePresetStore.setState((state) => ({
    presets: { ...state.presets, [id]: preset },
  }));
};

export const deletePreset = (id: string) => {
  usePresetStore.setState((state) => {
    const { [id]: _, ...remainingPresets } = state.presets;
    return { presets: remainingPresets };
  });
};
