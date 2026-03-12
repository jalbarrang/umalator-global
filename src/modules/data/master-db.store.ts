import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import DbWorker from '@workers/db/db.worker.ts?worker';
import type { Courses } from '@/lib/sunday-tools/course/definitions';
import type { DbWorkerInMessage, DbWorkerOutMessage } from '@/workers/db/db.worker';
import type { WorkerSyncPayload } from '@/workers/runtime-data-protocol';
import type { CoursesMap, UmasMap } from '@/workers/db/storage';
import type { SkillsMap } from './skill-types';
import { syncRuntimeMasterDbData } from './runtime-data-sync';

// Fallback to static data if the worker is not supported
import staticSkillsJson from './skills.json';
import staticUmasJson from './umas.json';
import staticLegacyCourseDataJson from './old_course_data.json';

type MasterDbSource = 'static' | 'cache' | 'fresh';
type JsonRecord = Record<string, unknown>;

type LegacyTrackCourseGroup = {
  courses?: Record<string, unknown>;
};

type MasterDbStoreState = {
  skills: SkillsMap;
  umas: UmasMap;
  courses: CoursesMap;
  source: MasterDbSource;
  isInitializing: boolean;
  isReady: boolean;
  isWorkerSupported: boolean;
  progressStep: string | null;
  progressPercent: number | null;
  resourceVersion: string;
  appVersion: string | null;
  fetchedAt: number | null;
  expiresAt: number | null;
  error: string | null;
  warning: string | null;
};

const staticSkills = staticSkillsJson as SkillsMap;
const staticUmas = staticUmasJson as UmasMap;
const staticCourses = normalizeStaticCourses(staticLegacyCourseDataJson);

let worker: Worker | null = null;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function sortByNumericKey<T>(input: Record<number, T>): Record<number, T> {
  return Object.fromEntries(
    Object.entries(input).sort(([a], [b]) => Number.parseFloat(a) - Number.parseFloat(b)),
  ) as Record<number, T>;
}

function normalizeCourse(rawCourse: unknown, trackIdFallback?: number): Courses[number] | null {
  if (!isRecord(rawCourse)) {
    return null;
  }

  const corners = Array.isArray(rawCourse.corners)
    ? rawCourse.corners.filter(isRecord).map((corner) => ({
        start: toNumber(corner.start),
        length: toNumber(corner.length),
      }))
    : [];

  const straights = Array.isArray(rawCourse.straights)
    ? rawCourse.straights.filter(isRecord).map((straight) => ({
        start: toNumber(straight.start),
        end: toNumber(straight.end),
        frontType: toNumber(straight.frontType),
      }))
    : [];

  const slopes = Array.isArray(rawCourse.slopes)
    ? rawCourse.slopes.filter(isRecord).map((slope) => ({
        start: toNumber(slope.start),
        length: toNumber(slope.length),
        slope: toNumber(slope.slope),
      }))
    : [];

  const courseSetStatus = Array.isArray(rawCourse.courseSetStatus)
    ? rawCourse.courseSetStatus.map((status) => toNumber(status)).filter((status) => status > 0)
    : [];

  return {
    raceTrackId: toNumber(rawCourse.raceTrackId, trackIdFallback ?? 0),
    distance: toNumber(rawCourse.distance),
    distanceType: toNumber(rawCourse.distanceType, 1) as Courses[number]['distanceType'],
    surface: toNumber(rawCourse.surface, 1) as Courses[number]['surface'],
    turn: toNumber(rawCourse.turn, 1) as Courses[number]['turn'],
    course: toNumber(rawCourse.course ?? rawCourse.inout, 1),
    laneMax: toNumber(rawCourse.laneMax),
    finishTimeMin: toNumber(rawCourse.finishTimeMin),
    finishTimeMax: toNumber(rawCourse.finishTimeMax),
    courseSetStatus: courseSetStatus as Courses[number]['courseSetStatus'],
    corners,
    straights,
    slopes,
  };
}

function normalizeGroupedLegacyCourses(input: JsonRecord): Record<number, Courses[number]> {
  const result: Record<number, Courses[number]> = {};

  for (const [trackId, trackValue] of Object.entries(input)) {
    if (!isRecord(trackValue)) {
      continue;
    }

    const courses = (trackValue as LegacyTrackCourseGroup).courses;
    if (!courses || !isRecord(courses)) {
      continue;
    }

    for (const [courseId, rawCourse] of Object.entries(courses)) {
      const normalizedCourse = normalizeCourse(rawCourse, toNumber(trackId));
      if (!normalizedCourse) {
        continue;
      }
      result[toNumber(courseId)] = normalizedCourse;
    }
  }

  return result;
}

function normalizeFlatCourses(input: JsonRecord): Record<number, Courses[number]> {
  const result: Record<number, Courses[number]> = {};

  for (const [courseId, rawCourse] of Object.entries(input)) {
    const normalizedCourse = normalizeCourse(rawCourse);
    if (!normalizedCourse) {
      continue;
    }
    result[toNumber(courseId)] = normalizedCourse;
  }

  return result;
}

function normalizeStaticCourses(rawCourses: unknown): CoursesMap {
  if (!isRecord(rawCourses)) {
    return {} as CoursesMap;
  }

  const firstValue = Object.values(rawCourses)[0];
  const isLikelyFlat =
    isRecord(firstValue) && ('distance' in firstValue || 'raceTrackId' in firstValue);

  const normalized = isLikelyFlat
    ? normalizeFlatCourses(rawCourses)
    : normalizeGroupedLegacyCourses(rawCourses);

  return sortByNumericKey(normalized) as CoursesMap;
}

function setErrorState(error: unknown): void {
  useMasterDbStore.setState({
    isInitializing: false,
    error: error instanceof Error ? error.message : 'Master DB worker failed',
  });
}

function bindWorkerEvents(target: Worker): void {
  target.onmessage = (event: MessageEvent<DbWorkerOutMessage>) => {
    const message = event.data;

    switch (message.type) {
      case 'progress': {
        useMasterDbStore.setState({
          isInitializing: true,
          progressStep: message.step,
          progressPercent: message.percent,
          error: null,
          warning: null,
        });
        break;
      }
      case 'data-ready': {
        useMasterDbStore.setState({
          skills: message.skills,
          umas: message.umas,
          courses: message.courses,
          source: message.source,
          resourceVersion: message.resourceVersion,
          appVersion: message.appVersion,
          isReady: true,
          isInitializing: false,
          progressPercent: 100,
          progressStep: 'Master DB data ready',
          error: null,
        });
        syncRuntimeMasterDbData({
          resourceVersion: message.resourceVersion,
          appVersion: message.appVersion,
          skills: message.skills,
          umas: message.umas,
        });
        break;
      }
      case 'status': {
        useMasterDbStore.setState({
          resourceVersion: message.resourceVersion,
          appVersion: message.appVersion,
          fetchedAt: message.fetchedAt,
          expiresAt: message.expiresAt,
          source: message.source,
          isReady: true,
          error: null,
          warning: message.warning ?? null,
        });
        break;
      }
      case 'error': {
        useMasterDbStore.setState({
          isInitializing: false,
          error: message.error,
          warning: null,
        });
        break;
      }
    }
  };

  target.onerror = (event: ErrorEvent) => {
    setErrorState(new Error(event.message || 'Master DB worker error'));
    useMasterDbStore.setState({
      progressStep: null,
      progressPercent: null,
    });
    target.terminate();
    worker = null;
  };

  target.onmessageerror = () => {
    setErrorState(new Error('Failed to decode message from master DB worker'));
  };
}

function ensureWorker(): Worker | null {
  if (worker) {
    return worker;
  }

  if (typeof Worker === 'undefined') {
    useMasterDbStore.setState({
      isWorkerSupported: false,
      isInitializing: false,
      error: 'Web workers are not available in this runtime',
    });
    return null;
  }

  try {
    worker = new DbWorker();
    bindWorkerEvents(worker);
  } catch (error) {
    setErrorState(error);
    worker = null;
  }

  return worker;
}

function postWorkerMessage(message: DbWorkerInMessage): void {
  const target = ensureWorker();
  if (!target) {
    return;
  }

  try {
    target.postMessage(message);
  } catch (error) {
    setErrorState(error);
  }
}

export const useMasterDbStore = create<MasterDbStoreState>()(() => ({
  skills: staticSkills,
  umas: staticUmas,
  courses: staticCourses,
  source: 'static',
  isInitializing: false,
  isReady: true,
  isWorkerSupported: typeof Worker !== 'undefined',
  progressStep: null,
  progressPercent: null,
  resourceVersion: 'static',
  appVersion: null,
  fetchedAt: null,
  expiresAt: null,
  error: null,
  warning: null,
}));

export function initializeMasterDbStore(): void {
  useMasterDbStore.setState({
    isInitializing: true,
    progressStep: 'Starting master DB worker',
    progressPercent: 0,
    error: null,
    warning: null,
  });
  postWorkerMessage({ type: 'init' });
}

export function refreshMasterDbStore(): void {
  useMasterDbStore.setState({
    isInitializing: true,
    progressStep: 'Refreshing master DB',
    progressPercent: 0,
    error: null,
    warning: null,
  });
  postWorkerMessage({ type: 'refresh' });
}

export function requestMasterDbStatus(): void {
  postWorkerMessage({ type: 'status' });
}

export function clearMasterDbError(): void {
  useMasterDbStore.setState({ error: null });
}

export function getMasterDbWorkerSyncPayload(): WorkerSyncPayload {
  const state = useMasterDbStore.getState();
  return {
    resourceVersion: state.resourceVersion,
    appVersion: state.appVersion,
    skills: state.skills,
    umas: state.umas,
  };
}

export function terminateMasterDbWorker(): void {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  useMasterDbStore.setState({
    isInitializing: false,
    progressStep: null,
    progressPercent: null,
  });
}

export const useSkills = () => useMasterDbStore(useShallow((state) => state.skills));
export const useUmas = () => useMasterDbStore(useShallow((state) => state.umas));
export const useCourses = () => useMasterDbStore(useShallow((state) => state.courses));

export const useMasterDbData = () =>
  useMasterDbStore(
    useShallow((state) => ({
      skills: state.skills,
      umas: state.umas,
      courses: state.courses,
    })),
  );

export const useMasterDbStatus = () =>
  useMasterDbStore(
    useShallow((state) => ({
      source: state.source,
      isInitializing: state.isInitializing,
      isReady: state.isReady,
      isWorkerSupported: state.isWorkerSupported,
      progressStep: state.progressStep,
      progressPercent: state.progressPercent,
      resourceVersion: state.resourceVersion,
      appVersion: state.appVersion,
      fetchedAt: state.fetchedAt,
      expiresAt: state.expiresAt,
      error: state.error,
      warning: state.warning,
    })),
  );
