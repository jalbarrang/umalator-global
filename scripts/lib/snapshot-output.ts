import { access } from 'node:fs/promises';
import path from 'node:path';
import { writeJsonFile } from './shared';

export const SNAPSHOT_IDS = ['global', 'jp'] as const;
export type SnapshotId = (typeof SNAPSHOT_IDS)[number];

export const DEFAULT_SNAPSHOT_ID: SnapshotId = 'global';

export type SnapshotManifestFiles = {
  skills: string;
  umas: string;
  courses: string;
  trackNames: string;
  courseGeometry: string;
};

export type SnapshotManifest = {
  snapshot: SnapshotId;
  label: string;
  version: string;
  files: SnapshotManifestFiles;
};

const DEFAULT_MANIFEST_FILES: SnapshotManifestFiles = {
  skills: 'skills.json',
  umas: 'umas.json',
  courses: 'course_data.json',
  trackNames: 'tracknames.json',
  courseGeometry: 'course_geometry.json',
};

export function getDefaultManifestFiles(): SnapshotManifestFiles {
  return { ...DEFAULT_MANIFEST_FILES };
}

export function isSnapshotId(value: string): value is SnapshotId {
  return SNAPSHOT_IDS.includes(value as SnapshotId);
}

export function getSnapshotLabel(snapshot: SnapshotId): string {
  return snapshot === 'global' ? 'Global' : 'JP';
}

/**
 * Catalog JSON (skills, umas, courses, tracknames) goes to src/modules/data/{snapshot}/
 * so it can be imported as ES modules by the frontend, workers, and CLI scripts.
 */
export function resolveSnapshotOutputDir(snapshot: SnapshotId): string {
  return path.join(process.cwd(), 'src/modules/data', snapshot);
}

/**
 * Geometry stays in public/data/{snapshot}/ because it's fetched lazily at runtime.
 */
export function resolveSnapshotGeometryDir(snapshot: SnapshotId): string {
  return path.join(process.cwd(), 'public/data', snapshot);
}

export function resolveSnapshotFile(snapshot: SnapshotId, fileName: string): string {
  return path.join(resolveSnapshotOutputDir(snapshot), fileName);
}

export function resolveSnapshotVersion(version?: string): string {
  return version?.trim() || process.env.UMALATOR_SNAPSHOT_VERSION?.trim() || 'unknown';
}

export function buildSnapshotManifest(input: {
  snapshot: SnapshotId;
  version: string;
  files?: Partial<SnapshotManifestFiles>;
}): SnapshotManifest {
  return {
    snapshot: input.snapshot,
    label: getSnapshotLabel(input.snapshot),
    version: input.version,
    files: {
      ...DEFAULT_MANIFEST_FILES,
      ...input.files,
    },
  };
}

export async function getMissingSnapshotFiles(
  snapshot: SnapshotId,
  files: Partial<SnapshotManifestFiles> = {},
): Promise<string[]> {
  const manifestFiles = {
    ...DEFAULT_MANIFEST_FILES,
    ...files,
  };

  const missing: string[] = [];
  for (const fileName of Object.values(manifestFiles)) {
    try {
      await access(resolveSnapshotFile(snapshot, fileName));
    } catch {
      missing.push(fileName);
    }
  }

  return missing;
}

export async function writeSnapshotManifest(input: {
  snapshot: SnapshotId;
  version: string;
  files?: Partial<SnapshotManifestFiles>;
}): Promise<void> {
  const manifest = buildSnapshotManifest(input);
  await writeJsonFile(resolveSnapshotFile(input.snapshot, 'manifest.json'), manifest);
}
