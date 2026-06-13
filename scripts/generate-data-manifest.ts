// Emit the runtime data datasets as content-hashed files under
// `public/<DATA_DIR>/` plus a stable `manifest.json` (logical key -> hashed
// filename). Used by the `data-manifest` Vite plugin (dev + build) and runnable
// standalone via `bun run data:manifest`.
//
// Why hashing + a stable manifest: the app fetches data at runtime instead of
// inlining ~3.6MB of JSON in the JS bundle, and because the bundle references
// only the stable manifest URL, a data-only change leaves the JS byte-identical.

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATASETS, DATA_DIR, MANIFEST_FILE } from '../src/modules/data/dataset-manifest';

const HASHED_RE = /\.[a-f0-9]{8}\.json$/;

/** Generate hashed dataset files + manifest under `<repoRoot>/public/<DATA_DIR>`. */
export function generateDataManifest(repoRoot: string): void {
  const jsonDir = join(repoRoot, 'src', 'modules', 'data', 'json');
  const outDir = join(repoRoot, 'public', DATA_DIR);

  mkdirSync(outDir, { recursive: true });

  // Drop previously-generated hashed files (and the manifest) so stale hashes
  // don't accumulate. Leave unrelated public/data assets (e.g. the gitignored
  // course_geometry.json) untouched.
  const generatedPrefixes = DATASETS.map((dataset) => `${dataset.outName}.`);
  for (const file of readdirSync(outDir)) {
    const isGenerated =
      file === MANIFEST_FILE ||
      (HASHED_RE.test(file) && generatedPrefixes.some((prefix) => file.startsWith(prefix)));
    if (isGenerated) {
      rmSync(join(outDir, file));
    }
  }

  const manifest: Record<string, string> = {};
  for (const dataset of DATASETS) {
    const sourcePath = join(jsonDir, dataset.source);
    if (!existsSync(sourcePath)) {
      throw new Error(`[data-manifest] missing source dataset: ${sourcePath}`);
    }
    const bytes = readFileSync(sourcePath);
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 8);
    const outFile = `${dataset.outName}.${hash}.json`;
    writeFileSync(join(outDir, outFile), bytes);
    manifest[dataset.key] = outFile;
  }

  writeFileSync(join(outDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
}

// CLI entry: `bun run data:manifest`
if (import.meta.main) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  generateDataManifest(repoRoot);
  console.log(`[data-manifest] generated ${DATASETS.length} datasets + ${MANIFEST_FILE}`);
}
