import { afterEach, describe, expect, it } from 'vitest';
import { getDataRuntime, initializeDataRuntime } from '@/modules/data/runtime';
import {
  getSnapshotStorageKey,
  GLOBAL_STORE_KEYS,
  SNAPSHOT_SCOPED_STORE_KEYS,
} from './snapshot-storage';

const initialRuntime = getDataRuntime();

afterEach(() => {
  initializeDataRuntime(initialRuntime);
});

describe('getSnapshotStorageKey', () => {
  it('prefixes persisted state keys with the active snapshot id', () => {
    expect(getSnapshotStorageKey('runners')).toBe('umalator:global:runners');

    initializeDataRuntime({
      ...initialRuntime,
      snapshot: 'jp',
    });

    expect(getSnapshotStorageKey('runners')).toBe('umalator:jp:runners');
    expect(getSnapshotStorageKey('skill-planner-v2')).toBe('umalator:jp:skill-planner-v2');
  });

  it('documents which persisted stores are snapshot-scoped versus global', () => {
    expect(SNAPSHOT_SCOPED_STORE_KEYS).toContain('runner-library');
    expect(SNAPSHOT_SCOPED_STORE_KEYS).toContain('skill-cost-meta');
    expect(GLOBAL_STORE_KEYS).toEqual(['theme', 'tutorial', 'ui', 'ocr']);
  });
});
