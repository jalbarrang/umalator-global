#!/usr/bin/env node
/**
 * Extract uma musume info from master.mdb
 * Ports make_global_uma_info.pl to TypeScript
 */

import path from 'node:path';
import { Command } from 'commander';
import { closeDatabase, openDatabase, queryAll, queryAllWithParams } from './lib/database';
import {
  readJsonFile,
  readJsonFileIfExists,
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

type ExtractUmaInfoOptions = {
  replaceMode: boolean;
  dbPath?: string;
};

function parseCliArgs(argv: Array<string>): ExtractUmaInfoOptions {
  const program = new Command();

  program
    .name('extract-uma-info')
    .description('Extract uma musume info from master.mdb')
    .option('-r, --replace', 'replace existing extracted data')
    .option('--full', 'alias for --replace')
    .argument('[dbPath]', 'path to master.mdb');

  program.parse(argv);

  const options = program.opts<{ replace?: boolean; full?: boolean }>();
  const [dbPath] = program.args as Array<string>;

  return {
    replaceMode: Boolean(options.replace || options.full),
    dbPath,
  };
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

async function extractUmaInfo(options: ExtractUmaInfoOptions = { replaceMode: false }) {
  console.log('📖 Extracting uma musume info...\n');

  const { replaceMode, dbPath: cliDbPath } = options;
  const dbPath = await resolveMasterDbPath(cliDbPath);

  console.log(
    `Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (preserves future content)'}`,
  );
  console.log(`Database: ${dbPath}\n`);

  // Read existing files to check which umas are implemented
  const basePath = path.join(process.cwd(), 'src/modules/data');
  const skills = await readJsonFile<Record<string, unknown>>(path.join(basePath, 'skills.json'));

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
      const minOutfitIndex = umaId * 100;
      const maxOutfitIndex = (umaId + 1) * 100;
      const outfitRows = queryAllWithParams<OutfitRow>(
        db,
        `SELECT [index], text FROM text_data
         WHERE category = 5
         AND [index] BETWEEN ? AND ?
         ORDER BY [index] ASC`,
        minOutfitIndex,
        maxOutfitIndex,
      );

      const outfits: Record<string, string> = {};

      // Filter outfits by checking if their unique skill exists in extracted skills
      for (const outfitRow of outfitRows) {
        const outfitId = outfitRow.index;
        const epithet = outfitRow.text;

        // Calculate unique skill ID for this outfit
        const skillId = uniqueSkillForOutfit(outfitId);

        // Only include outfit if the unique skill exists in extracted skills
        // (filters out unimplemented umas in global version)
        if (skills[skillId.toString()]) {
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

    // Merge with existing data (unless replace mode)
    const outputPath = path.join(basePath, 'umas.json');

    let finalUmas: Record<string, UmaInfo>;

    if (replaceMode) {
      finalUmas = umas;
      console.log(`\n⚠️  Full replacement mode: ${processedCount} umas from master.mdb only`);
    } else {
      const existingData = await readJsonFileIfExists<Record<string, UmaInfo>>(outputPath);

      if (existingData) {
        // Merge: existing data first, then overwrite with new data
        finalUmas = { ...existingData, ...umas };

        const finalCount = Object.keys(finalUmas).length;
        const preserved = finalCount - processedCount;

        console.log(`\n✓ Merge mode:`);
        console.log(`  → ${processedCount} umas from master.mdb (current content)`);
        console.log(`  → ${preserved} additional umas preserved (future content)`);
        console.log(`  → ${finalCount} total umas`);
      } else {
        finalUmas = umas;
        console.log(`\n✓ No existing file found, using master.mdb data only`);
      }
    }

    // Sort and write output
    const sorted = sortByNumericKey(finalUmas);
    await writeJsonFile(outputPath, sorted);

    const totalOutfits = Object.values(sorted).reduce(
      (sum, uma) => sum + Object.keys(uma.outfits).length,
      0,
    );
    console.log(`\n✓ Written to ${outputPath}`);
    console.log(`✓ Total outfits: ${totalOutfits}`);
  } finally {
    closeDatabase(db);
  }
}

// Run if called directly
if (import.meta.main) {
  const options = parseCliArgs(process.argv);

  extractUmaInfo(options).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { extractUmaInfo, parseCliArgs };
