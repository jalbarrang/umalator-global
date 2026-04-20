/**
 * Snapshot catalog loader using dynamic ES module imports.
 *
 * Works identically in the main thread, web workers, and CLI scripts
 * because it uses `import()` on JSON modules — no fetch, no URL resolution.
 *
 * Geometry is excluded (stays as a lazy fetch from public/).
 */

import type { SnapshotId, SnapshotCatalog } from './runtime';
import type { SkillsMap } from './skills';
import type { UmasMap } from './umas';
import type { CoursesMap } from './courses';
import type { TrackNamesMap } from './runtime';

type CatalogData = Omit<SnapshotCatalog, 'courseGeometryPath'>;

/**
 * Vite/Rolldown eager-glob all JSON files in snapshot subdirectories.
 * This makes them available as bundled modules without failing when
 * a snapshot directory (like jp/) does not exist yet.
 */
const snapshotModules = import.meta.glob<{ default: unknown }>(
  ['./**/skills.json', './**/umas.json', './**/course_data.json', './**/tracknames.json'],
  { eager: true },
);

function getSnapshotModule<T>(snapshot: string, fileName: string): T {
  const key = `./${snapshot}/${fileName}`;
  const mod = snapshotModules[key];

  if (!mod) {
    throw new Error(`Snapshot data not found: ${key}`);
  }

  return mod.default as T;
}

export async function loadSnapshotCatalog(snapshot: SnapshotId): Promise<CatalogData> {
  return {
    skills: getSnapshotModule<SkillsMap>(snapshot, 'skills.json'),
    umas: getSnapshotModule<UmasMap>(snapshot, 'umas.json'),
    courses: getSnapshotModule<CoursesMap>(snapshot, 'course_data.json'),
    trackNames: getSnapshotModule<TrackNamesMap>(snapshot, 'tracknames.json'),
  };
}

export async function isSnapshotAvailable(snapshot: SnapshotId): Promise<boolean> {
  try {
    const key = `./${snapshot}/skills.json`;
    return key in snapshotModules;
  } catch {
    return false;
  }
}
