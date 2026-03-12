import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchMasterDb: vi.fn(),
  extractSkills: vi.fn(),
  extractUmas: vi.fn(),
  extractCourses: vi.fn(),
  createMasterDbMeta: vi.fn(),
  loadCachedMasterDbSnapshot: vi.fn(),
  loadValidCachedMasterDbSnapshot: vi.fn(),
  saveExtractedDataToCache: vi.fn(),
  saveMasterDbFile: vi.fn(),
  initSqlJsModule: vi.fn(),
}));

vi.mock('../../polyfills', () => ({}));
vi.mock('sql.js/dist/sql-wasm.js', () => ({
  default: mocks.initSqlJsModule,
}));
vi.mock('sql.js/dist/sql-wasm.wasm?url', () => ({
  default: '/mock/sql-wasm.wasm',
}));
vi.mock('./fetch-master-db', () => ({
  fetchMasterDb: mocks.fetchMasterDb,
}));
vi.mock('./extract-skills', () => ({
  extractSkills: mocks.extractSkills,
}));
vi.mock('./extract-umas', () => ({
  extractUmas: mocks.extractUmas,
}));
vi.mock('./extract-courses', () => ({
  extractCourses: mocks.extractCourses,
}));
vi.mock('./storage', () => ({
  createMasterDbMeta: mocks.createMasterDbMeta,
  loadCachedMasterDbSnapshot: mocks.loadCachedMasterDbSnapshot,
  loadValidCachedMasterDbSnapshot: mocks.loadValidCachedMasterDbSnapshot,
  saveExtractedDataToCache: mocks.saveExtractedDataToCache,
  saveMasterDbFile: mocks.saveMasterDbFile,
}));

type WorkerMessageEvent = { data: { type: 'init' } | { type: 'refresh' } | { type: 'status' } };

async function setupWorkerHarness() {
  vi.resetModules();

  const listeners: Record<string, Array<(event: WorkerMessageEvent) => void>> = {};
  const addEventListener = vi.fn((eventName: string, handler: (event: WorkerMessageEvent) => void) => {
    if (!listeners[eventName]) {
      listeners[eventName] = [];
    }
    listeners[eventName].push(handler);
  });

  const postMessage = vi.fn();
  Object.assign(globalThis, {
    self: { addEventListener },
    postMessage,
  });

  await import('./db.worker');
  const messageHandler = listeners.message?.[0];
  if (!messageHandler) {
    throw new Error('db.worker did not register a message handler');
  }

  return {
    messageHandler,
    postMessage,
  };
}

describe('db.worker message flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.loadValidCachedMasterDbSnapshot.mockResolvedValue(null);
    mocks.loadCachedMasterDbSnapshot.mockResolvedValue(null);
    mocks.fetchMasterDb.mockResolvedValue({
      resourceVersion: '20260308',
      appVersion: '1.20.14',
      platform: 'Windows',
      mdbData: new Uint8Array([1, 2, 3]),
    });
    mocks.createMasterDbMeta.mockReturnValue({
      resourceVersion: '20260308',
      appVersion: '1.20.14',
      fetchedAt: 1000,
      expiresAt: 2000,
    });
    mocks.extractSkills.mockReturnValue({
      '10011': {
        rarity: 3,
        alternatives: [
          {
            precondition: '',
            condition: '',
            baseDuration: 1,
            effects: [],
          },
        ],
        groupId: 100,
        iconId: '10011',
        baseCost: 180,
        order: 1,
        name: 'Skill',
        source: 'master',
      },
    });
    mocks.extractUmas.mockReturnValue({ '1001': { name: ['', 'Uma'], outfits: { '100101': 'Outfit' } } });
    mocks.extractCourses.mockResolvedValue({ 10101: { raceTrackId: 101, distance: 1200 } });
    mocks.saveMasterDbFile.mockResolvedValue(undefined);
    mocks.saveExtractedDataToCache.mockResolvedValue(undefined);

    const dbClose = vi.fn();
    const sqlModule = {
      Database: class {
        close() {
          dbClose();
        }
      },
    };
    mocks.initSqlJsModule.mockResolvedValue(sqlModule);
  });

  it('serves valid cache on init without fetching', async () => {
    const cached = {
      data: {
        skills: { '1': { name: 'CachedSkill' } },
        umas: { '2': { name: ['', 'CachedUma'], outfits: { '200201': 'CachedOutfit' } } },
        courses: { 3: { raceTrackId: 999 } },
      },
      meta: {
        resourceVersion: 'cached-ver',
        appVersion: 'cached-app',
        fetchedAt: 10,
        expiresAt: 20,
      },
    };
    mocks.loadValidCachedMasterDbSnapshot.mockResolvedValue(cached);

    const { messageHandler, postMessage } = await setupWorkerHarness();
    messageHandler({ data: { type: 'init' } });

    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({
        type: 'data-ready',
        resourceVersion: 'cached-ver',
        appVersion: 'cached-app',
        skills: cached.data.skills,
        umas: cached.data.umas,
        courses: cached.data.courses,
      });
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'status',
      resourceVersion: 'cached-ver',
      appVersion: 'cached-app',
      fetchedAt: 10,
      expiresAt: 20,
      source: 'cache',
      warning: null,
    });
    expect(mocks.fetchMasterDb).not.toHaveBeenCalled();
  });

  it('refresh bypasses cache and returns fresh extracted data', async () => {
    const { messageHandler, postMessage } = await setupWorkerHarness();
    messageHandler({ data: { type: 'refresh' } });

    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({
        type: 'data-ready',
        resourceVersion: '20260308',
        appVersion: '1.20.14',
        skills: {
          '10011': {
            rarity: 3,
            alternatives: [
              {
                precondition: '',
                condition: '',
                baseDuration: 1,
                effects: [],
              },
            ],
            groupId: 100,
            iconId: '10011',
            baseCost: 180,
            order: 1,
            name: 'Skill',
            source: 'master',
          },
        },
        umas: { '1001': { name: ['', 'Uma'], outfits: { '100101': 'Outfit' } } },
        courses: { 10101: { raceTrackId: 101, distance: 1200 } },
      });
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'status',
      resourceVersion: '20260308',
      appVersion: '1.20.14',
      fetchedAt: 1000,
      expiresAt: 2000,
      source: 'fresh',
      warning: null,
    });

    expect(mocks.fetchMasterDb).toHaveBeenCalledTimes(1);
    expect(mocks.saveMasterDbFile).toHaveBeenCalledTimes(1);
    expect(mocks.saveExtractedDataToCache).toHaveBeenCalledTimes(1);
  });

  it('falls back to stale cache when fetch fails', async () => {
    mocks.fetchMasterDb.mockRejectedValue(new Error('network down'));
    const stale = {
      data: {
        skills: { '9': { name: 'StaleSkill' } },
        umas: { '8': { name: ['', 'StaleUma'], outfits: { '800801': 'StaleOutfit' } } },
        courses: { 7: { raceTrackId: 707 } },
      },
      meta: {
        resourceVersion: 'stale-ver',
        appVersion: 'stale-app',
        fetchedAt: 11,
        expiresAt: 12,
      },
    };
    mocks.loadCachedMasterDbSnapshot.mockResolvedValue(stale);

    const { messageHandler, postMessage } = await setupWorkerHarness();
    messageHandler({ data: { type: 'init' } });

    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({
        type: 'data-ready',
        resourceVersion: 'stale-ver',
        appVersion: 'stale-app',
        skills: stale.data.skills,
        umas: stale.data.umas,
        courses: stale.data.courses,
      });
    });

    expect(postMessage).toHaveBeenCalledWith({
      type: 'status',
      resourceVersion: 'stale-ver',
      appVersion: 'stale-app',
      fetchedAt: 11,
      expiresAt: 12,
      source: 'cache',
      warning: 'Failed to update master DB (network down). Using stale cached data until a valid update is available.',
    });
  });

  it('does not persist invalid extracted payload and falls back to stale cache', async () => {
    mocks.extractSkills.mockReturnValue({});
    const stale = {
      data: {
        skills: { '9': { name: 'StaleSkill' } },
        umas: { '8': { name: ['', 'StaleUma'], outfits: { '800801': 'StaleOutfit' } } },
        courses: { 7: { raceTrackId: 707, distance: 1400 } },
      },
      meta: {
        resourceVersion: 'stale-ver',
        appVersion: 'stale-app',
        fetchedAt: 11,
        expiresAt: 12,
      },
    };
    mocks.loadCachedMasterDbSnapshot.mockResolvedValue(stale);

    const { messageHandler, postMessage } = await setupWorkerHarness();
    messageHandler({ data: { type: 'refresh' } });

    await vi.waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith({
        type: 'status',
        resourceVersion: 'stale-ver',
        appVersion: 'stale-app',
        fetchedAt: 11,
        expiresAt: 12,
        source: 'cache',
        warning:
          "Failed to update master DB (Extracted payload validation failed: no skills were extracted). Using stale cached data until a valid update is available.",
      });
    });

    expect(mocks.saveExtractedDataToCache).not.toHaveBeenCalled();
    expect(mocks.saveMasterDbFile).not.toHaveBeenCalled();
  });
});
