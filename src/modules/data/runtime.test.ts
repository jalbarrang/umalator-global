import { afterEach, describe, expect, it } from 'vitest';
import {
  getDataRuntime,
  initializeDataRuntime,
  isDataRuntimeInitialized,
  resetDataRuntimeForTests,
} from './runtime';
import {
  buildSnapshotSwitchUrl,
  buildSnapshotUrl,
  resolveSnapshotFromLocation,
} from './snapshots';
import { loadSnapshotCatalog, isSnapshotAvailable } from './snapshot-loader';

const initialRuntime = getDataRuntime();

afterEach(() => {
  initializeDataRuntime(initialRuntime);
});

describe('resolveSnapshotFromLocation', () => {
  it('defaults to global when the query string is missing or invalid', () => {
    expect(resolveSnapshotFromLocation(new URL('https://example.com/#/race-sim'))).toBe('global');
    expect(
      resolveSnapshotFromLocation(new URL('https://example.com/?snapshot=nope#/race-sim')),
    ).toBe('global');
  });

  it('accepts supported snapshot ids from the regular query string', () => {
    expect(resolveSnapshotFromLocation(new URL('https://example.com/?snapshot=jp#/race-sim'))).toBe(
      'jp',
    );
  });
});

describe('buildSnapshotUrl', () => {
  it('preserves hash-router fragments while canonicalizing the snapshot query parameter', () => {
    const currentUrl = new URL('https://example.com/umalator/?snapshot=nope#/race-sim');

    expect(buildSnapshotUrl('global', currentUrl)).toBe('/umalator/#/race-sim');
    expect(buildSnapshotSwitchUrl('jp', currentUrl)).toBe('/umalator/?snapshot=jp#/race-sim');
  });
});

describe('snapshot-loader', () => {
  it('loads the global catalog via ES module import', async () => {
    const catalog = await loadSnapshotCatalog('global');

    expect(catalog.skills).toBeDefined();
    expect(catalog.umas).toBeDefined();
    expect(catalog.courses).toBeDefined();
    expect(catalog.trackNames).toBeDefined();
    expect(Object.keys(catalog.skills).length).toBeGreaterThan(0);
  });

  it('reports global as available', async () => {
    expect(await isSnapshotAvailable('global')).toBe(true);
  });

  it('reports jp as unavailable when jp data does not exist', async () => {
    expect(await isSnapshotAvailable('jp')).toBe(false);
  });
});

describe('runtime singleton', () => {
  it('throws when read before initialization', () => {
    resetDataRuntimeForTests();
    expect(isDataRuntimeInitialized()).toBe(false);
    expect(() => getDataRuntime()).toThrow('Data runtime has not been initialized yet.');
  });
});
