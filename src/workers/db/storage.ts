import type { Courses } from '@/lib/sunday-tools/course/definitions';
import type { SkillsMap } from '@/modules/data/skill-types';

export type UmasMap = Record<
  string,
  {
    name: Array<string>;
    outfits: Record<string, string>;
  }
>;

export type CoursesMap = Courses;

export interface MasterDbExtractedData {
  skills: SkillsMap;
  umas: UmasMap;
  courses: CoursesMap;
}

export interface MasterDbMeta {
  resourceVersion: string;
  appVersion: string | null;
  fetchedAt: number;
  expiresAt: number;
}

export interface CachedMasterDbSnapshot {
  data: MasterDbExtractedData;
  meta: MasterDbMeta;
}

type StorageManagerWithOpfs = StorageManager & {
  getDirectory?: () => Promise<FileSystemDirectoryHandle>;
};

const MASTER_DB_FILE_NAME = 'master.mdb';
const CACHE_DB_NAME = 'masterdb-cache';
const CACHE_DB_VERSION = 1;
const STORE_EXTRACTED = 'extracted';
const STORE_META = 'meta';
const EXTRACTED_CACHE_KEY = 'masterdb_extracted';
const META_CACHE_KEY = 'masterdb_meta';

export const MASTER_DB_DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

type LegacyMasterDbMeta = {
  appVer?: unknown;
  fetchedAt?: unknown;
  expiresAt?: unknown;
};

function getOpfsStorageManager(): StorageManagerWithOpfs {
  const storage = globalThis.navigator?.storage as StorageManagerWithOpfs | undefined;
  if (!storage?.getDirectory) {
    throw new Error('OPFS is not supported in this runtime');
  }
  return storage;
}

async function getOpfsRootDirectory(): Promise<FileSystemDirectoryHandle> {
  return getOpfsStorageManager().getDirectory();
}

function getIndexedDbFactory(): IDBFactory {
  if (!globalThis.indexedDB) {
    throw new Error('IndexedDB is not supported in this runtime');
  }
  return globalThis.indexedDB;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
  });
}

async function openCacheDb(): Promise<IDBDatabase> {
  const indexedDb = getIndexedDbFactory();

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(CACHE_DB_NAME, CACHE_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_EXTRACTED)) {
        database.createObjectStore(STORE_EXTRACTED);
      }

      if (!database.objectStoreNames.contains(STORE_META)) {
        database.createObjectStore(STORE_META);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export function createMasterDbMeta(
  resourceVersion: string,
  options: {
    appVersion?: string | null;
    fetchedAt?: number;
    ttlMs?: number;
  } = {},
): MasterDbMeta {
  const fetchedAt = options.fetchedAt ?? Date.now();
  const ttlMs = Math.max(0, options.ttlMs ?? MASTER_DB_DEFAULT_TTL_MS);

  return {
    resourceVersion,
    appVersion: options.appVersion ?? null,
    fetchedAt,
    expiresAt: fetchedAt + ttlMs,
  };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function normalizeVersionField(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    return trimmed;
  }

  return null;
}

function normalizeMasterDbMeta(meta: unknown): MasterDbMeta | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }

  const record = meta as Record<string, unknown>;
  const fetchedAt = toFiniteNumber(record.fetchedAt);
  const expiresAt = toFiniteNumber(record.expiresAt);
  if (fetchedAt === null || expiresAt === null) {
    return null;
  }

  const resourceVersion = normalizeVersionField(record.resourceVersion);
  if (resourceVersion) {
    return {
      resourceVersion,
      appVersion: normalizeVersionField(record.appVersion),
      fetchedAt,
      expiresAt,
    };
  }

  const legacy = meta as LegacyMasterDbMeta;
  const legacyAppVer = normalizeVersionField(legacy.appVer);
  if (!legacyAppVer) {
    return null;
  }

  return {
    resourceVersion: legacyAppVer,
    appVersion: legacyAppVer,
    fetchedAt,
    expiresAt,
  };
}

export function isMasterDbMetaExpired(meta: MasterDbMeta, now: number = Date.now()): boolean {
  return meta.expiresAt <= now;
}

export async function hasMasterDbFile(): Promise<boolean> {
  const root = await getOpfsRootDirectory();

  try {
    await root.getFileHandle(MASTER_DB_FILE_NAME);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return false;
    }
    throw error;
  }
}

export async function saveMasterDbFile(mdbData: Uint8Array): Promise<void> {
  const root = await getOpfsRootDirectory();
  const fileHandle = await root.getFileHandle(MASTER_DB_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  const writeData = new Uint8Array(mdbData);

  try {
    await writable.write(writeData);
  } finally {
    await writable.close();
  }
}

export async function loadMasterDbFile(): Promise<Uint8Array | null> {
  const root = await getOpfsRootDirectory();

  try {
    const fileHandle = await root.getFileHandle(MASTER_DB_FILE_NAME);
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return null;
    }
    throw error;
  }
}

export async function deleteMasterDbFile(): Promise<void> {
  const root = await getOpfsRootDirectory();

  try {
    await root.removeEntry(MASTER_DB_FILE_NAME);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return;
    }
    throw error;
  }
}

export async function saveExtractedDataToCache(
  data: MasterDbExtractedData,
  meta: MasterDbMeta,
): Promise<void> {
  const db = await openCacheDb();

  try {
    const transaction = db.transaction([STORE_EXTRACTED, STORE_META], 'readwrite');
    transaction.objectStore(STORE_EXTRACTED).put(data, EXTRACTED_CACHE_KEY);
    transaction.objectStore(STORE_META).put(meta, META_CACHE_KEY);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}

export async function loadCachedMasterDbSnapshot(): Promise<CachedMasterDbSnapshot | null> {
  const db = await openCacheDb();

  try {
    const transaction = db.transaction([STORE_EXTRACTED, STORE_META], 'readonly');
    const dataRequest = transaction.objectStore(STORE_EXTRACTED).get(EXTRACTED_CACHE_KEY);
    const metaRequest = transaction.objectStore(STORE_META).get(META_CACHE_KEY);

    const [data, rawMeta] = await Promise.all([
      requestToPromise<MasterDbExtractedData | undefined>(dataRequest),
      requestToPromise<unknown>(metaRequest),
    ]);

    await transactionDone(transaction);

    const meta = normalizeMasterDbMeta(rawMeta);
    if (!data || !meta) {
      return null;
    }

    return { data, meta };
  } finally {
    db.close();
  }
}

export async function loadValidCachedMasterDbSnapshot(
  now: number = Date.now(),
): Promise<CachedMasterDbSnapshot | null> {
  const snapshot = await loadCachedMasterDbSnapshot();
  if (!snapshot) {
    return null;
  }

  return isMasterDbMetaExpired(snapshot.meta, now) ? null : snapshot;
}

export async function clearExtractedDataCache(): Promise<void> {
  const db = await openCacheDb();

  try {
    const transaction = db.transaction([STORE_EXTRACTED, STORE_META], 'readwrite');
    transaction.objectStore(STORE_EXTRACTED).delete(EXTRACTED_CACHE_KEY);
    transaction.objectStore(STORE_META).delete(META_CACHE_KEY);
    await transactionDone(transaction);
  } finally {
    db.close();
  }
}
