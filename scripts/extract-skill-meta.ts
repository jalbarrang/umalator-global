#!/usr/bin/env bun
/**
 * Extract skill metadata from master.mdb
 * Ports make_global_skill_meta.pl to TypeScript
 */

import path from 'path';
import { openDatabase, closeDatabase, queryAll } from './lib/database';
import { resolveMasterDbPath, sortByNumericKey, writeJsonFile } from './lib/shared';

interface SkillMetaRow {
  id: number;
  group_id: number;
  icon_id: number;
  need_skill_point: number;
  disp_order: number;
}

interface SkillMetaEntry {
  groupId: number;
  iconId: string;
  baseCost: number;
  order: number;
}

async function extractSkillMeta() {
  console.log('📖 Extracting skill metadata...\n');

  const dbPath = await resolveMasterDbPath();
  const replaceMode = process.argv.includes('--replace') || process.argv.includes('--full');

  console.log(`Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (preserves future content)'}`);
  console.log(`Database: ${dbPath}\n`);

  const db = openDatabase(dbPath);

  try {
    // Query skill metadata with LEFT JOIN to get skill point costs
    const rows = queryAll<SkillMetaRow>(
      db,
      `SELECT s.id, s.group_id, s.icon_id, COALESCE(sp.need_skill_point, 0) as need_skill_point, s.disp_order
       FROM skill_data s
       LEFT JOIN single_mode_skill_need_point sp ON s.id = sp.id`,
    );

    console.log(`Found ${rows.length} skills\n`);

    // Transform to output format
    const skillMeta: Record<string, SkillMetaEntry> = {};
    for (const row of rows) {
      skillMeta[row.id.toString()] = {
        groupId: row.group_id,
        iconId: row.icon_id.toString(),
        baseCost: row.need_skill_point,
        order: row.disp_order,
      };
    }

    // Merge with existing data (unless replace mode)
    const outputPath = path.join(
      process.cwd(),
      'src/modules/data/skill_meta.json',
    );

    let finalSkillMeta: Record<string, SkillMetaEntry>;

    if (replaceMode) {
      finalSkillMeta = skillMeta;
      console.log(`\n⚠️  Full replacement mode: ${Object.keys(skillMeta).length} skills from master.mdb only`);
    } else {
      const existingFile = Bun.file(outputPath);

      if (await existingFile.exists()) {
        const existingData = await existingFile.json();
        const existingCount = Object.keys(existingData).length;
        const newCount = Object.keys(skillMeta).length;

        // Merge: existing data first, then overwrite with new data
        finalSkillMeta = { ...existingData, ...skillMeta };

        const finalCount = Object.keys(finalSkillMeta).length;
        const preserved = finalCount - newCount;

        console.log(`\n✓ Merge mode:`);
        console.log(`  → ${newCount} skills from master.mdb (current content)`);
        console.log(`  → ${preserved} additional skills preserved (future content)`);
        console.log(`  → ${finalCount} total skills`);
      } else {
        finalSkillMeta = skillMeta;
        console.log(`\n✓ No existing file found, using master.mdb data only`);
      }
    }

    // Sort and write output
    const sorted = sortByNumericKey(finalSkillMeta);
    await writeJsonFile(outputPath, sorted);
    console.log(`\n✓ Written to ${outputPath}`);
  } finally {
    closeDatabase(db);
  }
}

// Run if called directly
if (import.meta.main) {
  extractSkillMeta().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { extractSkillMeta };

