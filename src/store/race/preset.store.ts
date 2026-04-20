import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RacePreset } from '@/utils/races';
import { useSettingsStore } from '@/store/settings.store';
import cmPresets from './cm-presets.json';
import { createSnapshotJSONStorage, getSnapshotStorageKey } from '@/lib/storage/snapshot-storage';

const PRESET_STORE_NAME = getSnapshotStorageKey('presets');

const defaultPresets: Record<string, RacePreset> = Object.fromEntries(
  cmPresets.map((p) => [p.id, p as RacePreset]),
);
const defaultPresetOrder = cmPresets.map((p) => p.id);
const bundledPresetIds = new Set(defaultPresetOrder);

export type IPresetStore = {
  presets: Record<string, RacePreset>;
  presetOrder: string[];
};

function mergePresetsWithBundled(
  persisted: IPresetStore | undefined,
  current: IPresetStore,
): IPresetStore {
  if (!persisted?.presets) {
    return current;
  }

  const mergedPresets: Record<string, RacePreset> = { ...defaultPresets };
  for (const [id, preset] of Object.entries(persisted.presets)) {
    if (!bundledPresetIds.has(id)) {
      mergedPresets[id] = preset;
    }
  }

  const seen = new Set<string>(defaultPresetOrder);
  const presetOrder: string[] = [...defaultPresetOrder];
  for (const id of persisted.presetOrder ?? []) {
    if (!seen.has(id) && mergedPresets[id]) {
      presetOrder.push(id);
      seen.add(id);
    }
  }
  for (const id of Object.keys(mergedPresets)) {
    if (!seen.has(id)) {
      presetOrder.push(id);
      seen.add(id);
    }
  }

  return { presets: mergedPresets, presetOrder };
}

function clearSelectedPresetIfInvalid(presets: Record<string, RacePreset>) {
  const sid = useSettingsStore.getState().selectedPresetId;
  if (sid && !presets[sid]) {
    useSettingsStore.setState({ selectedPresetId: null });
  }
}

export const usePresetStore = create<IPresetStore>()(
  persist(
    (_) => ({
      presetOrder: defaultPresetOrder,
      presets: defaultPresets,
    }),
    {
      name: PRESET_STORE_NAME,
      storage: createSnapshotJSONStorage(),
      merge: (persisted, current) => {
        const state = persisted as IPresetStore | null | undefined;
        if (!state) return current;
        return mergePresetsWithBundled(state, current);
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) return;
        const presets = state?.presets ?? usePresetStore.getState().presets;
        clearSelectedPresetIfInvalid(presets);
      },
    },
  ),
);

/** Call after preset hydration (or from settings) if selectedPresetId may reference a removed preset. */
export function syncSelectedPresetWithCatalog() {
  clearSelectedPresetIfInvalid(usePresetStore.getState().presets);
}

export const addPreset = (preset: RacePreset) => {
  usePresetStore.setState((state) => ({
    presets: { ...state.presets, [preset.id]: preset },
    presetOrder: [preset.id, ...state.presetOrder],
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
    return {
      presets: remainingPresets,
      presetOrder: state.presetOrder.filter((pid) => pid !== id),
    };
  });
};

export const deletePresets = (ids: string[]) => {
  const idSet = new Set(ids);
  usePresetStore.setState((state) => {
    const remaining: Record<string, RacePreset> = {};
    for (const [key, value] of Object.entries(state.presets)) {
      if (!idSet.has(key)) remaining[key] = value;
    }
    return {
      presets: remaining,
      presetOrder: state.presetOrder.filter((pid) => !idSet.has(pid)),
    };
  });
};

export const reorderPresets = (newOrder: string[]) => {
  usePresetStore.setState({ presetOrder: newOrder });
};

export const resetPresets = () => {
  usePresetStore.setState({ presets: defaultPresets, presetOrder: defaultPresetOrder });
  useSettingsStore.setState({ selectedPresetId: null });
};
