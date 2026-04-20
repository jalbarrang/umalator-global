#!/usr/bin/env node
/**
 * Master script to run all data extraction scripts
 */

import { extractSkills } from './extract-skills';
import { extractUmaInfo } from './extract-uma-info';
import { extractCourseData } from './extract-course-data';
import { Command, Option } from 'commander';
import { DEFAULT_SNAPSHOT_ID, SNAPSHOT_IDS, type SnapshotId } from './lib/snapshot-output';
import { normalizeCommanderArgv } from './lib/shared';

type ExtractAllOptions = {
  replaceMode: boolean;
  dbPath?: string;
  snapshot: SnapshotId;
};

function parseCliArgs(argv: Array<string>): ExtractAllOptions {
  const program = new Command();

  program
    .name('extract-all')
    .description('Run all data extraction scripts in sequence')
    .option('-r, --replace', 'replace existing extracted data')
    .option('--full', 'alias for --replace')
    .addOption(
      new Option('--snapshot <snapshot>', 'target snapshot output')
        .choices(SNAPSHOT_IDS)
        .default(DEFAULT_SNAPSHOT_ID),
    )
    .argument('[dbPath]', 'path to master.mdb');

  program.parse(normalizeCommanderArgv(argv));

  const options = program.opts<{ replace?: boolean; full?: boolean; snapshot: SnapshotId }>();
  const [dbPath] = program.args as Array<string>;

  return {
    replaceMode: Boolean(options.replace || options.full),
    dbPath,
    snapshot: options.snapshot,
  };
}

async function extractAll(
  options: ExtractAllOptions = { replaceMode: false, snapshot: DEFAULT_SNAPSHOT_ID },
) {
  const { replaceMode, dbPath, snapshot } = options;

  console.log('🚀 Starting full data extraction...\n');
  console.log(
    `Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (default - preserves future content)'}`,
  );
  console.log(`Snapshot: ${snapshot}`);
  console.log('='.repeat(60));

  const startTime = Date.now();
  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  // Run extractions in sequence
  const extractions: Array<{
    name: string;
    fn: (options: { replaceMode: boolean; dbPath?: string; snapshot: SnapshotId }) => Promise<void>;
  }> = [
    { name: 'Skills', fn: extractSkills },
    { name: 'Uma Info', fn: extractUmaInfo },
    { name: 'Course Data', fn: extractCourseData },
  ];

  for (const { name, fn } of extractions) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 ${name}`);
      console.log('='.repeat(60));
      await fn({ replaceMode, dbPath, snapshot });
      results.push({ name, success: true });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Failed to extract ${name}: ${errorMsg}`);
      results.push({ name, success: false, error: errorMsg });
    }
  }

  // Print summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Extraction Summary');
  console.log('='.repeat(60));

  for (const result of results) {
    const status = result.success ? '✓' : '✗';
    const message = result.success ? 'Success' : `Failed: ${result.error}`;
    console.log(`${status} ${result.name}: ${message}`);
  }

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;

  if (successCount === totalCount) {
    console.log(
      `ℹ️  Snapshot manifest/version for ${snapshot} is only finalized by extract-course-geometry, because geometry must be regenerated alongside the other catalog files.`,
    );
  }

  console.log(`\n✨ Completed ${successCount}/${totalCount} extractions in ${duration}s`);

  if (successCount < totalCount) {
    console.error('\n⚠️  Some extractions failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  const options = parseCliArgs(process.argv);

  extractAll(options).catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
}

export { extractAll, parseCliArgs };
