// Runtime fetcher for the manifest-driven datasets. Resolves the stable
// `${basePath}data/manifest.json` once, then fetches each content-hashed
// dataset on demand (memoized). The hashed filenames are immutable, so the
// browser/CDN cache them indefinitely; the manifest itself sits at a stable URL
// so a data-only deploy never changes the JS bundle. Mirrors the lazy+memoized
// pattern in `course-geometry.ts`.

import { config } from '@/config';
import {
  DATA_DIR,
  MANIFEST_FILE,
  type DataManifest,
  type DatasetKey
} from '@/modules/data/dataset-manifest';

const dataUrl = (file: string) => `${config.basePath}${DATA_DIR}/${file}`;

let manifestPromise: Promise<DataManifest> | null = null;

function loadManifest(): Promise<DataManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch(dataUrl(MANIFEST_FILE)).then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load data manifest: ${response.status} ${response.statusText}`);
      }
      return (await response.json()) as DataManifest;
    });
  }
  return manifestPromise;
}

const datasetPromises = new Map<DatasetKey, Promise<unknown>>();

/** Fetch + parse a dataset by logical key (memoized for the realm's lifetime). */
export function fetchDataset<T>(key: DatasetKey): Promise<T> {
  const existing = datasetPromises.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = loadManifest().then(async (manifest) => {
    const file = manifest[key];
    if (!file) {
      throw new Error(`Dataset "${key}" missing from data manifest`);
    }
    const response = await fetch(dataUrl(file));
    if (!response.ok) {
      throw new Error(`Failed to load dataset "${key}": ${response.status} ${response.statusText}`);
    }
    return response.json();
  });

  datasetPromises.set(key, promise);
  return promise as Promise<T>;
}
