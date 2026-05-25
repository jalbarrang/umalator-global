#!/usr/bin/env node

import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Command } from 'commander';
import { readJsonFileIfExists } from '../master-data/shared';
import { loadManifest, loadManifestData } from './gametora-client';

type SyncDataOptions = {
  dryRun: boolean;
  force: boolean;
};

type SyncTarget = {
  manifestKey: string;
  outputFile: string;
};

type DataManifest = {
  syncedAt: string;
  gametora: {
    keys: Record<string, string>;
  };
  masterDb: {
    resourceVersion: string | null;
    extractedAt: string | null;
  };
};

const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..');
const DATA_MANIFEST_PATH = path.join(ROOT_DIR, 'data-manifest.json');
const GAMETORA_OUTPUT_DIR = path.join(ROOT_DIR, 'src', 'modules', 'data', 'json', 'gametora');

const SYNC_TARGETS: Array<SyncTarget> = [
  { manifestKey: 'skills', outputFile: 'skills.json' },
  { manifestKey: 'character-cards', outputFile: 'character-cards.json' },
  { manifestKey: 'support-cards', outputFile: 'support-cards.json' },
  { manifestKey: 'support_effects', outputFile: 'support-effects.json' },
  { manifestKey: 'training_events/ssr', outputFile: 'training-events-ssr.json' },
  { manifestKey: 'training_events/sr', outputFile: 'training-events-sr.json' },
  { manifestKey: 'training_events/shared', outputFile: 'training-events-shared.json' },
  { manifestKey: 'training_events/friend', outputFile: 'training-events-friend.json' },
  { manifestKey: 'training_events/group', outputFile: 'training-events-group.json' },
  { manifestKey: 'dict/evrew', outputFile: 'evrew.json' },
  { manifestKey: 'dict/te_names_en', outputFile: 'te-names-en.json' },
  { manifestKey: 'dict/te_names_ja', outputFile: 'te-names-ja.json' }
];

function parseCliArgs(argv: Array<string>): SyncDataOptions {
  const program = new Command();

  program
    .name('sync:data')
    .description('Fetch and snapshot GameTora entity catalog data')
    .option('--force', 're-fetch all tracked keys regardless of manifest hash')
    .option('--dry-run', 'show what would change without writing files');

  program.parse(argv);

  const options = program.opts<{ dryRun?: boolean; force?: boolean }>();

  return {
    dryRun: Boolean(options.dryRun),
    force: Boolean(options.force)
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function outputPathFor(target: SyncTarget): string {
  return path.join(GAMETORA_OUTPUT_DIR, target.outputFile);
}

function buildDataManifest(
  nextManifest: Record<string, string>,
  previous: DataManifest | null
): DataManifest {
  const gametoraKeys = SYNC_TARGETS.reduce<Record<string, string>>((acc, target) => {
    acc[target.manifestKey] = nextManifest[target.manifestKey] ?? '';
    return acc;
  }, {});

  return {
    syncedAt: new Date().toISOString(),
    gametora: {
      keys: gametoraKeys
    },
    masterDb: {
      resourceVersion: previous?.masterDb?.resourceVersion ?? null,
      extractedAt: previous?.masterDb?.extractedAt ?? null
    }
  };
}

async function syncGameTora(
  options: SyncDataOptions = { dryRun: false, force: false }
): Promise<void> {
  const { dryRun, force } = options;

  console.log('Loading GameTora manifest...');
  const remoteManifest = await loadManifest();
  console.log(`  Manifest loaded (${Object.keys(remoteManifest).length} entries)`);

  const localManifest = await readJsonFileIfExists<DataManifest>(DATA_MANIFEST_PATH);
  if (localManifest) {
    console.log(`Loaded local manifest: ${path.relative(ROOT_DIR, DATA_MANIFEST_PATH)}`);
  } else {
    console.log('No local data-manifest.json found; full sync required.');
  }

  const targetsToFetch: Array<SyncTarget> = [];
  const skippedTargets: Array<SyncTarget> = [];

  for (const target of SYNC_TARGETS) {
    const nextHash = remoteManifest[target.manifestKey];
    if (!nextHash) {
      throw new Error(`GameTora manifest is missing key: ${target.manifestKey}`);
    }

    const previousHash = localManifest?.gametora?.keys?.[target.manifestKey] ?? null;
    const outputPath = outputPathFor(target);
    const outputExists = await fileExists(outputPath);
    const hashChanged = previousHash !== nextHash;
    const shouldFetch = force || !outputExists || !localManifest || hashChanged;

    if (shouldFetch) {
      targetsToFetch.push(target);
      const reasons = [
        force ? 'forced' : null,
        !localManifest ? 'no local manifest' : null,
        !outputExists ? 'missing snapshot' : null,
        hashChanged ? `hash ${previousHash ?? '∅'} → ${nextHash}` : null
      ].filter(Boolean);
      console.log(
        `  [fetch] ${target.manifestKey} -> ${target.outputFile} (${reasons.join(', ')})`
      );
    } else {
      skippedTargets.push(target);
      console.log(`  [skip]  ${target.manifestKey} (${nextHash})`);
    }
  }

  console.log(`\nSummary: ${targetsToFetch.length} fetch, ${skippedTargets.length} unchanged.`);

  const fetchedEntries: Array<{ target: SyncTarget; data: unknown }> = [];
  for (const target of targetsToFetch) {
    const data = await loadManifestData<unknown>(remoteManifest, target.manifestKey);
    if (data == null) {
      throw new Error(`Failed to load GameTora data for ${target.manifestKey}`);
    }

    fetchedEntries.push({ target, data });
  }

  if (dryRun) {
    console.log('\n[dry-run] Skipping snapshot writes and data-manifest update.');
    return;
  }

  await mkdir(GAMETORA_OUTPUT_DIR, { recursive: true });

  for (const entry of fetchedEntries) {
    const outputPath = outputPathFor(entry.target);
    await writeFile(outputPath, `${JSON.stringify(entry.data)}\n`, 'utf8');
    console.log(`Wrote ${path.relative(ROOT_DIR, outputPath)}`);
  }

  const nextDataManifest = buildDataManifest(remoteManifest, localManifest);
  await writeFile(DATA_MANIFEST_PATH, `${JSON.stringify(nextDataManifest, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(ROOT_DIR, DATA_MANIFEST_PATH)}`);
}

if (import.meta.main) {
  const options = parseCliArgs(process.argv);

  syncGameTora(options).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to sync GameTora snapshots:', message);
    process.exit(1);
  });
}

export { parseCliArgs, syncGameTora };
export type { DataManifest, SyncDataOptions, SyncTarget };
