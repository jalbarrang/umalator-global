import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = 'https://gametora.com';
const USER_AGENT = 'Mozilla/5.0 (compatible; uma-sim-scraper/1.0)';
const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..');
const CACHE_DIR = path.join(ROOT_DIR, '.cache', 'gametora');

type Manifest = Record<string, string>;

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function cachePathFor(url: string): string {
  const slug = url
    .replace(/^https?:\/\//, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .slice(0, 200);
  const ext = slug.endsWith('.json') ? '' : '.json';

  return path.join(CACHE_DIR, `${slug}${ext}`);
}

async function fetchJsonCached<T>(url: string): Promise<T> {
  const cached = cachePathFor(url);

  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as T;
    await ensureDir(CACHE_DIR);
    await writeFile(cached, JSON.stringify(data), 'utf8');

    return data;
  } catch (error) {
    try {
      const content = await readFile(cached, 'utf8');
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  [cache-fallback] ${url}: ${message}`);
      return JSON.parse(content) as T;
    } catch {
      throw error;
    }
  }
}

async function loadManifest(): Promise<Manifest> {
  return fetchJsonCached<Manifest>(`${BASE_URL}/data/manifests/umamusume.json`);
}

function manifestUrl(manifest: Manifest, key: string): string | null {
  const hash = manifest[key];
  if (!hash) {
    return null;
  }

  return `${BASE_URL}/data/umamusume/${key}.${hash}.json`;
}

async function loadManifestData<T>(manifest: Manifest, key: string): Promise<T | null> {
  const url = manifestUrl(manifest, key);
  if (!url) {
    console.log(`  [manifest] No hash for "${key}"`);
    return null;
  }

  return fetchJsonCached<T>(url);
}

export { loadManifest, loadManifestData };
export type { Manifest };
