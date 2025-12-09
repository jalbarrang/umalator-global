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

    // Sort and write output
    const sorted = sortByNumericKey(skillMeta);
    const outputPath = path.join(
      process.cwd(),
      'src/modules/data/skill_meta.json',
    );

    await writeJsonFile(outputPath, sorted);
    console.log(`✓ Written to ${outputPath}`);
    console.log(`✓ Total skills: ${Object.keys(sorted).length}`);
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

