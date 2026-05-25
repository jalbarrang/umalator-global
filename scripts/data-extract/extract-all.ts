#!/usr/bin/env node
/**
 * Primary master.mdb extraction entrypoint.
 * Extracts course geometry and Global live cutover artifacts.
 */

import { extractCourseData } from './extract-course-data';
import { extractSkills } from './extract-skills';
import { extractSupportCards } from './extract-support-cards';
import { extractUmaInfo } from './extract-uma-info';
import { Command } from 'commander';

type ExtractAllOptions = {
  replaceMode: boolean;
  dbPath?: string;
  resourceVersion?: string;
  resolveResourceVersion: boolean;
};

function parseCliArgs(argv: Array<string>): ExtractAllOptions {
  const program = new Command();

  program
    .name('extract-all')
    .description('Run the primary master.mdb extraction pipeline (courses + Global cutover)')
    .option('-r, --replace', 'replace existing extracted data')
    .option('--full', 'alias for --replace')
    .option('--resource-version <version>', 'master.mdb resource version for data-manifest.json')
    .option(
      '--resolve-resource-version',
      'fetch the latest resource version from uma.moe for data-manifest.json'
    )
    .argument('[dbPath]', 'path to master.mdb');

  program.parse(argv);

  const options = program.opts<{
    replace?: boolean;
    full?: boolean;
    resourceVersion?: string;
    resolveResourceVersion?: boolean;
  }>();
  const [dbPath] = program.args as Array<string>;

  return {
    replaceMode: Boolean(options.replace || options.full),
    dbPath,
    resourceVersion: options.resourceVersion?.trim() || undefined,
    resolveResourceVersion: Boolean(options.resolveResourceVersion)
  };
}

async function extractAll(
  options: ExtractAllOptions = { replaceMode: false, resolveResourceVersion: false }
) {
  const { replaceMode, dbPath, resourceVersion, resolveResourceVersion } = options;

  console.log('🚀 Starting primary master.mdb extraction...\n');
  console.log(
    `Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (default - preserves future content)'}`
  );
  console.log('='.repeat(60));

  const startTime = Date.now();
  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  const extractions: Array<{
    name: string;
    fn: (options: {
      replaceMode: boolean;
      dbPath?: string;
      resourceVersion?: string;
      resolveResourceVersion: boolean;
    }) => Promise<void>;
  }> = [
    {
      name: 'Skills (Global cutover)',
      fn: ({ replaceMode, dbPath }) => extractSkills({ replaceMode, dbPath })
    },
    {
      name: 'Umas (Global cutover)',
      fn: ({ replaceMode, dbPath }) => extractUmaInfo({ replaceMode, dbPath })
    },
    {
      name: 'Support Cards (Global cutover)',
      fn: ({ replaceMode, dbPath }) => extractSupportCards({ replaceMode, dbPath })
    },
    { name: 'Course Data', fn: extractCourseData }
  ];

  for (const { name, fn } of extractions) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 ${name}`);
      console.log('='.repeat(60));
      await fn({ replaceMode, dbPath, resourceVersion, resolveResourceVersion });
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
