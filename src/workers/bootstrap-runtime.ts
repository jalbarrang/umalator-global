/**
 * Worker runtime bootstrap via ES module imports.
 *
 * Provides an async init function that workers call before processing.
 * Uses the same import-based snapshot-loader as the main thread.
 */

import {
  DEFAULT_SNAPSHOT_ID,
  initializeDataRuntime,
  isDataRuntimeInitialized,
  type SnapshotId,
} from '@/modules/data/runtime';
import { loadSnapshotCatalog } from '@/modules/data/snapshot-loader';
import { buildCourseGeometryPath } from '@/modules/data/course-geometry';

let initPromise: Promise<void> | null = null;

/**
 * Initialize the data runtime for this worker.
 * Safe to call multiple times — only runs once.
 */
export function ensureWorkerRuntime(snapshot: SnapshotId = DEFAULT_SNAPSHOT_ID): Promise<void> {
  if (isDataRuntimeInitialized()) {
    return Promise.resolve();
  }

  if (!initPromise) {
    initPromise = loadSnapshotCatalog(snapshot).then((catalog) => {
      if (!isDataRuntimeInitialized()) {
        initializeDataRuntime({
          snapshot,
          catalog: {
            ...catalog,
            courseGeometryPath: buildCourseGeometryPath(snapshot),
          },
        });
      }
    });
  }

  return initPromise;
}
