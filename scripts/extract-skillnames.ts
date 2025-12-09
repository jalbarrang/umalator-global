#!/usr/bin/env bun
/**
 * Extract skill names from master.mdb
 * Ports make_global_skillnames.pl to TypeScript
 */

import path from 'path';
import { openDatabase, closeDatabase, queryAll } from './lib/database';
import { resolveMasterDbPath, sortByNumericKey, writeJsonFile } from './lib/shared';

interface SkillNameRow {
  index: number;
  text: string;
}

type SkillNamesEntry = [string];

async function extractSkillNames() {
  console.log('📖 Extracting skill names...\n');

  const dbPath = await resolveMasterDbPath();
  console.log(`Database: ${dbPath}\n`);

  const db = openDatabase(dbPath);

  try {
    // Query skill names from text_data (category 47 = skill names)
    const rows = queryAll<SkillNameRow>(
      db,
      `SELECT [index], text FROM text_data WHERE category = 47`,
    );

    console.log(`Found ${rows.length} skill names\n`);

    // Transform to output format
    const skillNames: Record<string, SkillNamesEntry> = {};

    for (const row of rows) {
      const id = row.index;
      // Bun handles UTF-8 automatically, no need for explicit decoding
      const name = row.text;
      skillNames[id.toString()] = [name];

      // Add inherited versions of unique skills
      // Unique skills have IDs starting with '1', inherited versions start with '9'
      const idStr = id.toString();
      if (idStr.match(/^1(\d+)/)) {
        const inheritedId = '9' + idStr.substring(1);
        skillNames[inheritedId] = [name + ' (inherited)'];
      }
    }

    // Sort and write output
    const sorted = sortByNumericKey(skillNames);
    const outputPath = path.join(
      process.cwd(),
      'src/modules/data/skillnames.json',
    );

    await writeJsonFile(outputPath, sorted);
    console.log(`✓ Written to ${outputPath}`);
    console.log(
      `✓ Total skill names: ${Object.keys(sorted).length} (including inherited versions)`,
    );
  } finally {
    closeDatabase(db);
  }
}

// Run if called directly
if (import.meta.main) {
  extractSkillNames().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { extractSkillNames };

