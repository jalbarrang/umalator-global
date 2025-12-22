#!/usr/bin/env bun
/**
 * Extract skill data from master.mdb
 * Ports make_global_skill_data.pl to TypeScript
 */

import path from 'node:path';
import { closeDatabase, openDatabase, queryAll } from './lib/database';
import { resolveMasterDbPath, sortByNumericKey, writeJsonFile } from './lib/shared';

interface SkillDataRow {
  id: number;
  rarity: number;
  condition_1: string;
  float_ability_time_1: number;
  ability_type_1_1: number;
  float_ability_value_1_1: number;
  target_type_1_1: number;
  ability_type_1_2: number;
  float_ability_value_1_2: number;
  target_type_1_2: number;
  ability_type_1_3: number;
  float_ability_value_1_3: number;
  target_type_1_3: number;
  condition_2: string;
  float_ability_time_2: number;
  ability_type_2_1: number;
  float_ability_value_2_1: number;
  target_type_2_1: number;
  ability_type_2_2: number;
  float_ability_value_2_2: number;
  target_type_2_2: number;
  ability_type_2_3: number;
  float_ability_value_2_3: number;
  target_type_2_3: number;
}

interface SkillEffect {
  type: number;
  modifier: number;
  target: number;
}

interface SkillAlternative {
  precondition: string;
  condition: string;
  baseDuration: number;
  effects: Array<SkillEffect>;
}

interface SkillDataEntry {
  rarity: number;
  alternatives: Array<SkillAlternative>;
}

// Scenario skills that need 1.2x modifier
const SCENARIO_SKILLS = new Set([
  210011,
  210012,
  210021,
  210022,
  210031,
  210032,
  210041,
  210042,
  210051,
  210052, // Aoharu
  210061,
  210062, // Make A New Track
  210071,
  210072, // Grand Live
  210081,
  210082, // updated URA
  210261,
  210262,
  210271,
  210272,
  210281,
  210282, // Grand Masters
  210291, // RFTS (white version)
]);

// Skills that need split alternatives (Seirios special case)
const SPLIT_ALTERNATIVES = new Set([100701, 900701]);

/**
 * Apply scenario skill modifier patch
 */
function patchModifier(id: number, value: number): number {
  if (SCENARIO_SKILLS.has(id)) {
    return value * 1.2;
  }
  return value;
}

async function extractSkillData() {
  console.log('📖 Extracting skill data...\n');

  const dbPath = await resolveMasterDbPath();
  const replaceMode = process.argv.includes('--replace') || process.argv.includes('--full');

  console.log(
    `Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (preserves future content)'}`,
  );
  console.log(`Database: ${dbPath}\n`);

  const db = openDatabase(dbPath);

  try {
    // Query all skill data with conditions and abilities
    const rows = queryAll<SkillDataRow>(
      db,
      `SELECT id, rarity,
              condition_1,
              float_ability_time_1,
              ability_type_1_1, float_ability_value_1_1, target_type_1_1,
              ability_type_1_2, float_ability_value_1_2, target_type_1_2,
              ability_type_1_3, float_ability_value_1_3, target_type_1_3,
              condition_2,
              float_ability_time_2,
              ability_type_2_1, float_ability_value_2_1, target_type_2_1,
              ability_type_2_2, float_ability_value_2_2, target_type_2_2,
              ability_type_2_3, float_ability_value_2_3, target_type_2_3
       FROM skill_data`,
    );

    console.log(`Found ${rows.length} skills\n`);

    // Transform to output format
    const skillData: Record<string, SkillDataEntry> = {};

    for (const row of rows) {
      // Build effects for first alternative
      const effects1: Array<SkillEffect> = [
        {
          type: row.ability_type_1_1,
          modifier: patchModifier(row.id, row.float_ability_value_1_1),
          target: row.target_type_1_1,
        },
      ];

      if (row.ability_type_1_2 !== 0) {
        effects1.push({
          type: row.ability_type_1_2,
          modifier: patchModifier(row.id, row.float_ability_value_1_2),
          target: row.target_type_1_2,
        });
      }

      if (row.ability_type_1_3 !== 0) {
        effects1.push({
          type: row.ability_type_1_3,
          modifier: patchModifier(row.id, row.float_ability_value_1_3),
          target: row.target_type_1_3,
        });
      }

      // Build alternatives array
      const alternatives: Array<SkillAlternative> = [
        {
          precondition: '',
          condition: row.condition_1,
          baseDuration: row.float_ability_time_1,
          effects: effects1,
        },
      ];

      // Add second alternative if it exists
      if (row.condition_2 && row.condition_2 !== '' && row.condition_2 !== '0') {
        const effects2: Array<SkillEffect> = [
          {
            type: row.ability_type_2_1,
            modifier: patchModifier(row.id, row.float_ability_value_2_1),
            target: row.target_type_2_1,
          },
        ];

        if (row.ability_type_2_2 !== 0) {
          effects2.push({
            type: row.ability_type_2_2,
            modifier: patchModifier(row.id, row.float_ability_value_2_2),
            target: row.target_type_2_2,
          });
        }

        if (row.ability_type_2_3 !== 0) {
          effects2.push({
            type: row.ability_type_2_3,
            modifier: patchModifier(row.id, row.float_ability_value_2_3),
            target: row.target_type_2_3,
          });
        }

        alternatives.push({
          precondition: '',
          condition: row.condition_2,
          baseDuration: row.float_ability_time_2,
          effects: effects2,
        });
      }

      // Handle split alternatives (Seirios special case)
      if (SPLIT_ALTERNATIVES.has(row.id)) {
        // Create separate entries for each alternative with discriminator suffix
        alternatives.forEach((alt, index) => {
          const suffix = index === 0 ? '' : `-${index}`;
          const key = `${row.id}${suffix}`;
          skillData[key] = {
            rarity: row.rarity,
            alternatives: [alt],
          };
        });
      } else {
        // Normal case: single entry with all alternatives
        skillData[row.id.toString()] = {
          rarity: row.rarity,
          alternatives: alternatives,
        };
      }
    }

    // Merge with existing data (unless replace mode)
    const outputPath = path.join(process.cwd(), 'src/modules/data/skill_data.json');

    let finalSkillData: Record<string, SkillDataEntry>;

    if (replaceMode) {
      finalSkillData = skillData;
      console.log(
        `\n⚠️  Full replacement mode: ${Object.keys(skillData).length} skills from master.mdb only`,
      );
    } else {
      const existingFile = Bun.file(outputPath);

      if (await existingFile.exists()) {
        const existingData = await existingFile.json();
        const newCount = Object.keys(skillData).length;

        // Merge: existing data first, then overwrite with new data
        finalSkillData = { ...existingData, ...skillData };

        const finalCount = Object.keys(finalSkillData).length;
        const preserved = finalCount - newCount;

        console.log(`\n✓ Merge mode:`);
        console.log(`  → ${newCount} skills from master.mdb (current content)`);
        console.log(`  → ${preserved} additional skills preserved (future content)`);
        console.log(`  → ${finalCount} total skills`);
      } else {
        finalSkillData = skillData;
        console.log(`\n✓ No existing file found, using master.mdb data only`);
      }
    }

    // Sort and write output
    const sorted = sortByNumericKey(finalSkillData);
    await writeJsonFile(outputPath, sorted);
    console.log(`\n✓ Written to ${outputPath}`);
  } finally {
    closeDatabase(db);
  }
}

// Run if called directly
if (import.meta.main) {
  extractSkillData().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { extractSkillData };
