import '@/polyfills';
// @ts-expect-error -- sql.js does not ship typings for its dist worker entry.
import initSqlJsModule from 'sql.js/dist/sql-wasm.js';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { fetchMasterDb } from './fetch-master-db';
import { extractSkills } from './extract-skills';
import { extractUmas } from './extract-umas';
import { extractCourses } from './extract-courses';
import {
  createMasterDbMeta,
  loadCachedMasterDbSnapshot,
  loadValidCachedMasterDbSnapshot,
  saveExtractedDataToCache,
  saveMasterDbFile,
  type MasterDbExtractedData,
  type MasterDbMeta,
} from './storage';
import type { SkillsMap } from '@/modules/data/skill-types';
import type { CoursesMap, UmasMap } from './storage';

type DbWorkerInMessage = { type: 'init' } | { type: 'refresh' } | { type: 'status' };

type DbWorkerOutMessage =
  | {
      type: 'data-ready';
      resourceVersion: string;
      appVersion: string | null;
      source: 'cache' | 'fresh';
      skills: SkillsMap;
      umas: UmasMap;
      courses: CoursesMap;
    }
  | { type: 'progress'; step: string; percent: number }
  | {
      type: 'status';
      resourceVersion: string;
      appVersion: string | null;
      fetchedAt: number;
      expiresAt: number;
      source: 'cache' | 'fresh';
      warning?: string | null;
    }
  | { type: 'error'; error: string };

type SqlValueLike = number | string | Uint8Array | null;

interface SqlStatementLike {
  bind: (params: Array<SqlValueLike>) => void;
  step: () => boolean;
  getAsObject: () => Record<string, SqlValueLike>;
  free: () => void;
}

interface SqlDatabaseLike {
  prepare: (sql: string) => SqlStatementLike;
  close: () => void;
}

interface SqlJsModuleLike {
  Database: new (data?: Uint8Array | ArrayLike<number> | ArrayBuffer | null) => SqlDatabaseLike;
}

type InitSqlJsLike = (config: {
  locateFile?: (fileName: string) => string;
}) => Promise<SqlJsModuleLike>;

interface PipelineResult {
  data: MasterDbExtractedData;
  meta: MasterDbMeta;
  source: 'cache' | 'fresh';
  warning?: string | null;
}

const initSqlJs = initSqlJsModule as unknown as InitSqlJsLike;
const CACHE_SOURCE: PipelineResult['source'] = 'cache';
const FRESH_SOURCE: PipelineResult['source'] = 'fresh';

let sqlModulePromise: Promise<SqlJsModuleLike> | null = null;
let activePipeline: Promise<PipelineResult> | null = null;
let lastKnownMeta: MasterDbMeta | null = null;
let lastKnownSource: PipelineResult['source'] = CACHE_SOURCE;
let lastKnownWarning: string | null = null;

const NUMERIC_KEY_PATTERN = /^\d+$/;
const NUMERIC_OR_SPLIT_KEY_PATTERN = /^\d+(?:-\d+)?$/;

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown worker error';
}

function sendMessage(message: DbWorkerOutMessage): void {
  postMessage(message);
}

function sendProgress(step: string, percent: number): void {
  sendMessage({
    type: 'progress',
    step,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
  });
}

function sendError(error: unknown): void {
  const message = toErrorMessage(error);
  sendMessage({
    type: 'error',
    error: message,
  });
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function validateExtractedPayload(data: MasterDbExtractedData): void {
  const skillEntries = Object.entries(data.skills);
  assert(skillEntries.length > 0, 'Extracted payload validation failed: no skills were extracted');

  for (const [skillId, skill] of skillEntries.slice(0, 250)) {
    assert(
      NUMERIC_OR_SPLIT_KEY_PATTERN.test(skillId),
      `Extracted payload validation failed: invalid skill id '${skillId}'`,
    );
    assert(skill && typeof skill === 'object', `Extracted payload validation failed: malformed skill '${skillId}'`);
    assert(Array.isArray(skill.alternatives), `Extracted payload validation failed: skill '${skillId}' alternatives are missing`);
  }

  const umaEntries = Object.entries(data.umas);
  assert(umaEntries.length > 0, 'Extracted payload validation failed: no umas were extracted');

  for (const [umaId, uma] of umaEntries.slice(0, 250)) {
    assert(NUMERIC_KEY_PATTERN.test(umaId), `Extracted payload validation failed: invalid uma id '${umaId}'`);
    assert(Array.isArray(uma?.name), `Extracted payload validation failed: malformed uma '${umaId}' name`);
    assert(uma.name.length >= 2, `Extracted payload validation failed: malformed uma '${umaId}' name`);
    assert(uma.outfits && typeof uma.outfits === 'object', `Extracted payload validation failed: malformed uma '${umaId}' outfits`);
  }

  const courseEntries = Object.entries(data.courses);
  assert(courseEntries.length > 0, 'Extracted payload validation failed: no courses were extracted');

  for (const [courseId, course] of courseEntries.slice(0, 250)) {
    assert(NUMERIC_KEY_PATTERN.test(courseId), `Extracted payload validation failed: invalid course id '${courseId}'`);
    assert(
      typeof course?.raceTrackId === 'number' && Number.isFinite(course.raceTrackId),
      `Extracted payload validation failed: malformed course '${courseId}' raceTrackId`,
    );
    assert(
      typeof course.distance === 'number' && Number.isFinite(course.distance),
      `Extracted payload validation failed: malformed course '${courseId}' distance`,
    );
  }
}

async function getSqlModule(): Promise<SqlJsModuleLike> {
  if (!sqlModulePromise) {
    sqlModulePromise = initSqlJs({
      locateFile: (fileName: string) => {
        if (fileName.endsWith('.wasm')) {
          return sqlWasmUrl;
        }
        return fileName;
      },
    });
  }
  return sqlModulePromise;
}

async function extractDataFromMdb(mdbData: Uint8Array): Promise<MasterDbExtractedData> {
  sendProgress('Loading SQL engine', 92);
  const sqlModule = await getSqlModule();
  const db = new sqlModule.Database(mdbData);

  try {
    sendProgress('Extracting skills', 95);
    const skills = extractSkills(db);

    sendProgress('Extracting umas', 97);
    const umas = extractUmas(db, skills);

    sendProgress('Extracting courses', 98);
    const courses = await extractCourses(db);

    return {
      skills,
      umas,
      courses,
    };
  } finally {
    db.close();
  }
}

async function runPipeline(forceRefresh: boolean): Promise<PipelineResult> {
  if (!forceRefresh) {
    sendProgress('Checking cached master DB data', 2);
    const cachedSnapshot = await loadValidCachedMasterDbSnapshot();
    if (cachedSnapshot) {
      sendProgress('Using cached extracted data', 100);
      return {
        data: cachedSnapshot.data,
        meta: cachedSnapshot.meta,
        source: CACHE_SOURCE,
      };
    }
  }

  sendProgress(forceRefresh ? 'Refreshing master DB' : 'Fetching latest master DB', 10);
  const fetchResult = await fetchMasterDb({
    onProgress: ({ step, percent }) => {
      sendProgress(step, percent);
    },
  });

  const extractedData = await extractDataFromMdb(fetchResult.mdbData);
  validateExtractedPayload(extractedData);

  sendProgress('Storing master DB in OPFS', 91);
  await saveMasterDbFile(fetchResult.mdbData);

  const meta = createMasterDbMeta(fetchResult.resourceVersion, {
    appVersion: fetchResult.appVersion,
  });

  sendProgress('Caching extracted data', 99);
  await saveExtractedDataToCache(extractedData, meta);

  sendProgress('Master DB data ready', 100);
  return {
    data: extractedData,
    meta,
    source: FRESH_SOURCE,
    warning: null,
  };
}

async function runPipelineWithFallback(forceRefresh: boolean): Promise<PipelineResult> {
  try {
    return await runPipeline(forceRefresh);
  } catch (error) {
    const updateFailureMessage = toErrorMessage(error);
    const staleSnapshot = await loadCachedMasterDbSnapshot();
    if (staleSnapshot) {
      const warning =
        `Failed to update master DB (${updateFailureMessage}). ` +
        'Using stale cached data until a valid update is available.';
      sendProgress('Fetch failed, using stale cached data', 100);
      return {
        data: staleSnapshot.data,
        meta: staleSnapshot.meta,
        source: CACHE_SOURCE,
        warning,
      };
    }
    throw new Error(
      `Failed to update master DB (${updateFailureMessage}) and no cached fallback is available.`,
    );
  }
}

async function ensurePipeline(forceRefresh: boolean): Promise<PipelineResult> {
  if (!activePipeline) {
    activePipeline = runPipelineWithFallback(forceRefresh).finally(() => {
      activePipeline = null;
    });
  }
  return activePipeline;
}

async function sendStatusMessage(): Promise<void> {
  if (!lastKnownMeta) {
    const snapshot = await loadCachedMasterDbSnapshot();
    if (snapshot) {
      lastKnownMeta = snapshot.meta;
      lastKnownSource = CACHE_SOURCE;
      lastKnownWarning = null;
    }
  }

  if (!lastKnownMeta) {
    throw new Error('No master DB metadata available yet');
  }

  sendMessage({
    type: 'status',
    resourceVersion: lastKnownMeta.resourceVersion,
    appVersion: lastKnownMeta.appVersion,
    fetchedAt: lastKnownMeta.fetchedAt,
    expiresAt: lastKnownMeta.expiresAt,
    source: lastKnownSource,
    warning: lastKnownWarning,
  });
}

async function runInitOrRefresh(forceRefresh: boolean): Promise<void> {
  const pipelineResult = await ensurePipeline(forceRefresh);
  lastKnownMeta = pipelineResult.meta;
  lastKnownSource = pipelineResult.source;
  lastKnownWarning = pipelineResult.warning ?? null;

  sendMessage({
    type: 'data-ready',
    resourceVersion: pipelineResult.meta.resourceVersion,
    appVersion: pipelineResult.meta.appVersion,
    source: pipelineResult.source,
    skills: pipelineResult.data.skills,
    umas: pipelineResult.data.umas,
    courses: pipelineResult.data.courses,
  });

  sendMessage({
    type: 'status',
    resourceVersion: pipelineResult.meta.resourceVersion,
    appVersion: pipelineResult.meta.appVersion,
    fetchedAt: pipelineResult.meta.fetchedAt,
    expiresAt: pipelineResult.meta.expiresAt,
    source: pipelineResult.source,
    warning: pipelineResult.warning ?? null,
  });
}

async function handleMessage(message: DbWorkerInMessage): Promise<void> {
  switch (message.type) {
    case 'init':
      await runInitOrRefresh(false);
      break;
    case 'refresh':
      await runInitOrRefresh(true);
      break;
    case 'status':
      await sendStatusMessage();
      break;
  }
}

self.addEventListener('message', (event: MessageEvent<DbWorkerInMessage>) => {
  void handleMessage(event.data).catch((error: unknown) => {
    sendError(error);
  });
});

export type { DbWorkerInMessage, DbWorkerOutMessage };
