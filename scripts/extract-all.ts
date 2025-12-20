#!/usr/bin/env bun
/**
 * Master script to run all data extraction scripts
 */

import { extractSkillMeta } from './extract-skill-meta';
import { extractSkillNames } from './extract-skillnames';
import { extractSkillData } from './extract-skill-data';
import { extractUmaInfo } from './extract-uma-info';
import { extractCourseData } from './extract-course-data';

async function extractAll() {
  const replaceMode =
    process.argv.includes('--replace') || process.argv.includes('--full');

  console.log('🚀 Starting full data extraction...\n');
  console.log(
    `Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (default - preserves future content)'}`,
  );
  console.log('='.repeat(60));

  const startTime = Date.now();
  const results: Array<{ name: string; success: boolean; error?: string }> = [];

  // Run extractions in sequence
  const extractions = [
    { name: 'Skill Metadata', fn: extractSkillMeta },
    { name: 'Skill Names', fn: extractSkillNames },
    { name: 'Skill Data', fn: extractSkillData },
    { name: 'Uma Info', fn: extractUmaInfo },
    { name: 'Course Data', fn: extractCourseData },
  ];

  for (const { name, fn } of extractions) {
    try {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📦 ${name}`);
      console.log('='.repeat(60));
      await fn();
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

  console.log(
    `\n✨ Completed ${successCount}/${totalCount} extractions in ${duration}s`,
  );

  if (successCount < totalCount) {
    console.error(
      '\n⚠️  Some extractions failed. Please check the errors above.',
    );
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  extractAll().catch((error) => {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  });
}

export { extractAll };
