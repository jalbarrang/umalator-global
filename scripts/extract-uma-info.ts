#!/usr/bin/env bun
/**
 * Extract uma musume info from master.mdb
 * Ports make_global_uma_info.pl to TypeScript
 */

import path from 'path';
import { openDatabase, closeDatabase, queryAll, queryAllWithParams } from './lib/database';
import {
  resolveMasterDbPath,
  sortByNumericKey,
  writeJsonFile,
} from './lib/shared';

interface UmaNameRow {
  index: number;
  text: string;
}

interface OutfitRow {
  index: number;
  text: string;
}

interface UmaInfo {
  name: [string, string]; // [English name (empty for now), Japanese name]
  outfits: Record<string, string>; // {outfitId: epithet}
}

/**
 * Calculate unique skill ID from outfit ID
 * Formula from Perl: 100000 + 10000 * (v - 1) + i * 10 + 1
 * where i = middle digits, v = last 2 digits
 */
function uniqueSkillForOutfit(outfitId: number): number {
  const outfitIdStr = outfitId.toString();
  const i = parseInt(outfitIdStr.substring(1, outfitIdStr.length - 2));
  const v = parseInt(outfitIdStr.substring(outfitIdStr.length - 2));
  return 100000 + 10000 * (v - 1) + i * 10 + 1;
}

async function extractUmaInfo() {
  console.log('📖 Extracting uma musume info...\n');

  const dbPath = await resolveMasterDbPath();
  console.log(`Database: ${dbPath}\n`);

  // Read existing files to check which umas are implemented
  const basePath = path.join(process.cwd(), 'src/modules/data');
  const existingUmas = await Bun.file(path.join(basePath, 'umas.json')).json();
  const skillMeta = await Bun.file(path.join(basePath, 'skill_meta.json')).json();

  const db = openDatabase(dbPath);

  try {
    // Query uma names (category 6, index < 2000)
    const umaRows = queryAll<UmaNameRow>(
      db,
      `SELECT [index], text FROM text_data WHERE category = 6 AND [index] < 2000`,
    );

    console.log(`Found ${umaRows.length} uma musume\n`);

    const umas: Record<string, UmaInfo> = {};
    let processedCount = 0;

    for (const umaRow of umaRows) {
      const umaId = umaRow.index;
      const umaName = umaRow.text;

      // Query outfit epithets for this uma (category 5)
      // Outfit IDs are between (umaId * 100) and ((umaId + 1) * 100)
      const outfitRows = queryAllWithParams<OutfitRow>(
        db,
        `SELECT [index], text FROM text_data
         WHERE category = 5
         AND [index] BETWEEN ?1 * 100 AND (?1 + 1) * 100
         ORDER BY [index] ASC`,
        umaId,
      );

      const outfits: Record<string, string> = {};

      // Filter outfits by checking if their unique skill exists in skill_meta
      for (const outfitRow of outfitRows) {
        const outfitId = outfitRow.index;
        const epithet = outfitRow.text;

        // Calculate unique skill ID for this outfit
        const skillId = uniqueSkillForOutfit(outfitId);

        // Only include outfit if the unique skill exists in meta
        // (filters out unimplemented umas in global version)
        if (skillMeta[skillId.toString()]) {
          outfits[outfitId.toString()] = epithet;
        }
      }

      // Only add uma if they have at least one implemented outfit
      if (Object.keys(outfits).length > 0) {
        umas[umaId.toString()] = {
          name: ['', umaName], // Empty English name, Japanese name
          outfits: outfits,
        };
        processedCount++;
      }
    }

    // Sort and write output
    const sorted = sortByNumericKey(umas);
    const outputPath = path.join(basePath, 'umas.json');

    await writeJsonFile(outputPath, sorted);
    console.log(`✓ Written to ${outputPath}`);
    console.log(`✓ Total umas: ${processedCount} (with implemented outfits)`);
    console.log(`✓ Total outfits: ${Object.values(sorted).reduce((sum, uma) => sum + Object.keys(uma.outfits).length, 0)}`);
  } finally {
    closeDatabase(db);
  }
}

// Run if called directly
if (import.meta.main) {
  extractUmaInfo().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { extractUmaInfo };

