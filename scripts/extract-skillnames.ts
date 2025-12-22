#!/usr/bin/env bun
/**
 * Extract skill names from master.mdb
 * Ports make_global_skillnames.pl to TypeScript
 */

import path from 'node:path';
import { closeDatabase, openDatabase, queryAll } from './lib/database';
import { resolveMasterDbPath, sortByNumericKey, writeJsonFile } from './lib/shared';

interface SkillNameRow {
  index: number;
  text: string;
}

type SkillNamesEntry = [string];

async function extractSkillNames() {
  console.log('📖 Extracting skill names...\n');

  const dbPath = await resolveMasterDbPath();
  const replaceMode = process.argv.includes('--replace') || process.argv.includes('--full');

  console.log(
    `Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (preserves future content)'}`,
  );
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

    // Merge with existing data (unless replace mode)
    const outputPath = path.join(process.cwd(), 'src/modules/data/skillnames.json');

    let finalSkillNames: Record<string, SkillNamesEntry>;

    if (replaceMode) {
      finalSkillNames = skillNames;
      console.log(
        `\n⚠️  Full replacement mode: ${Object.keys(skillNames).length} skill names from master.mdb only`,
      );
    } else {
      const existingFile = Bun.file(outputPath);

      if (await existingFile.exists()) {
        const existingData = await existingFile.json();
        const newCount = Object.keys(skillNames).length;

        // Merge: existing data first, then overwrite with new data
        finalSkillNames = { ...existingData, ...skillNames };

        const finalCount = Object.keys(finalSkillNames).length;
        const preserved = finalCount - newCount;

        console.log(`\n✓ Merge mode:`);
        console.log(`  → ${newCount} skill names from master.mdb (current content)`);
        console.log(`  → ${preserved} additional skill names preserved (future content)`);
        console.log(`  → ${finalCount} total skill names`);
      } else {
        finalSkillNames = skillNames;
        console.log(`\n✓ No existing file found, using master.mdb data only`);
      }
    }

    // Sort and write output
    const sorted = sortByNumericKey(finalSkillNames);
    await writeJsonFile(outputPath, sorted);
    console.log(`\n✓ Written to ${outputPath}`);
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
