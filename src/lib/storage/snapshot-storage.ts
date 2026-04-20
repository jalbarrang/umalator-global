import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import { DEFAULT_SNAPSHOT_ID, getDataRuntime } from '@/modules/data/runtime';

const STORAGE_NAMESPACE = 'umalator';

/**
 * Persisted stores that reference runtime catalog ids must be isolated by snapshot.
 * These remain centralized here so store modules do not invent their own naming scheme.
 */
export const SNAPSHOT_SCOPED_STORE_KEYS = [
  'runners',
  'settings',
  'presets',
  'runner-library',
  'compare-debuffs',
  'race-sim',
  'skill-planner-v2',
  'skill-cost-meta',
] as const;

/**
 * Persisted preferences that stay shared across snapshots because they do not store
 * snapshot-specific catalog ids.
 */
export const GLOBAL_STORE_KEYS = ['theme', 'tutorial', 'ui', 'ocr'] as const;

const LEGACY_STORE_KEYS: Record<(typeof SNAPSHOT_SCOPED_STORE_KEYS)[number], string> = {
  runners: 'umalator-runners',
  settings: 'umalator-settings',
  presets: 'umalator-presets',
  'runner-library': 'umalator-runner-library',
  'compare-debuffs': 'umalator-compare-debuffs',
  'race-sim': 'umalator-race-sim',
  'skill-planner-v2': 'umalator-skill-planner-v2',
  'skill-cost-meta': 'umalator-skill-cost-meta',
};

export function getSnapshotStorageKey(baseKey: string): string {
  return `${STORAGE_NAMESPACE}:${getDataRuntime().snapshot}:${baseKey}`;
}

function getLegacyStorageKey(snapshotKey: string): string | null {
  const prefix = `${STORAGE_NAMESPACE}:${DEFAULT_SNAPSHOT_ID}:`;
  if (!snapshotKey.startsWith(prefix)) {
    return null;
  }

  const baseKey = snapshotKey.slice(prefix.length) as (typeof SNAPSHOT_SCOPED_STORE_KEYS)[number];
  return LEGACY_STORE_KEYS[baseKey] ?? null;
}

export const snapshotStateStorage: StateStorage = {
  getItem: (name) => {
    const currentValue = localStorage.getItem(name);
    if (currentValue !== null) {
      return currentValue;
    }

    const legacyKey = getLegacyStorageKey(name);
    if (!legacyKey) {
      return null;
    }

    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue !== null) {
      localStorage.setItem(name, legacyValue);
      return legacyValue;
    }

    return null;
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

export const createSnapshotJSONStorage = <T>() => createJSONStorage<T>(() => snapshotStateStorage);
