/**
 * CLI runtime bootstrap for scripts that import sunday-tools modules.
 *
 * CLI scripts run under tsx/Node where import.meta.glob is unavailable,
 * so this module uses direct dynamic imports instead of the Vite-based
 * snapshot-loader.
 *
 * Call this before touching any sunday-tools imports:
 *
 *   await bootstrapCliRuntime();
 */

import { initializeDataRuntime, type SnapshotCatalog } from '@/modules/data/runtime';
import type { SkillsMap } from '@/modules/data/skills';
import type { UmasMap } from '@/modules/data/umas';
import type { CoursesMap } from '@/modules/data/courses';
import type { TrackNamesMap } from '@/modules/data/runtime';
import { DEFAULT_SNAPSHOT_ID, type SnapshotId } from './snapshot-output';

async function loadCatalogDirect(snapshot: SnapshotId): Promise<Omit<SnapshotCatalog, 'courseGeometryPath'>> {
  // Resolve paths relative to the project root, using the same layout as the Vite glob
  const base = `@/modules/data/${snapshot}`;

  const [skills, umas, courses, trackNames] = await Promise.all([
    import(`../../src/modules/data/${snapshot}/skills.json`),
    import(`../../src/modules/data/${snapshot}/umas.json`),
    import(`../../src/modules/data/${snapshot}/course_data.json`),
    import(`../../src/modules/data/${snapshot}/tracknames.json`),
  ]);

  return {
    skills: skills.default as SkillsMap,
    umas: umas.default as UmasMap,
    courses: courses.default as CoursesMap,
    trackNames: trackNames.default as unknown as TrackNamesMap,
  };
}

export async function bootstrapCliRuntime(
  snapshot: SnapshotId = DEFAULT_SNAPSHOT_ID,
): Promise<void> {
  const catalog = await loadCatalogDirect(snapshot);

  initializeDataRuntime({
    snapshot,
    catalog: {
      ...catalog,
      courseGeometryPath: `public/data/${snapshot}/course_geometry.json`,
    },
  });
}
