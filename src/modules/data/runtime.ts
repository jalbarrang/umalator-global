import type { CoursesMap } from './courses';
import type { SkillsMap } from './skills';
import type { UmasMap } from './umas';

export const SNAPSHOT_IDS = ['global', 'jp'] as const;
export type SnapshotId = (typeof SNAPSHOT_IDS)[number];

export const DEFAULT_SNAPSHOT_ID: SnapshotId = 'global';

export type TrackNamesMap = Record<string, [string, string]>;

export type SnapshotCatalog = {
  skills: SkillsMap;
  umas: UmasMap;
  courses: CoursesMap;
  trackNames: TrackNamesMap;
  courseGeometryPath: string;
};

export type DataRuntime = {
  snapshot: SnapshotId;
  catalog: SnapshotCatalog;
};

let dataRuntime: DataRuntime | null = null;

export function initializeDataRuntime(input: DataRuntime): void {
  dataRuntime = input;
}

export function getDataRuntime(): DataRuntime {
  if (!dataRuntime) {
    throw new Error('Data runtime has not been initialized yet.');
  }

  return dataRuntime;
}

export function isDataRuntimeInitialized(): boolean {
  return dataRuntime !== null;
}

export function resetDataRuntimeForTests(): void {
  dataRuntime = null;
}

export function createRuntimeCatalogProxy<T extends object>(resolveValue: () => T): T {
  return new Proxy({} as T, {
    get(_target, property, receiver) {
      return Reflect.get(resolveValue(), property, receiver);
    },
    has(_target, property) {
      return Reflect.has(resolveValue(), property);
    },
    ownKeys() {
      return Reflect.ownKeys(resolveValue());
    },
    getOwnPropertyDescriptor(_target, property) {
      const descriptor = Reflect.getOwnPropertyDescriptor(resolveValue(), property);

      if (!descriptor) {
        return undefined;
      }

      return {
        ...descriptor,
        configurable: true,
      };
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(resolveValue());
    },
  });
}
