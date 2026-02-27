#!/usr/bin/env node
/**
 * Extract unified skill data from master.mdb
 * Combines metadata, names, and activation/effect data into one file.
 */

import path from 'node:path';
import { Command } from 'commander';
import { closeDatabase, openDatabase, queryAll } from './lib/database';
import { readJsonFileIfExists, resolveMasterDbPath, sortByNumericKey, writeJsonFile } from './lib/shared';
import type { SkillEntry } from '@/modules/data/skill-types';
import type { ISkillTarget } from '@/lib/sunday-tools/skills/definitions';

interface SkillRow {
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
  group_id: number;
  icon_id: number;
  need_skill_point: number;
  disp_order: number;
}

interface SkillNameRow {
  index: number;
  text: string;
}

type SkillEffect = {
  type: number;
  modifier: number;
  target: ISkillTarget;
};

type SkillAlternative = {
  precondition: string;
  condition: string;
  baseDuration: number;
  effects: Array<SkillEffect>;
};

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

const SPLIT_ALTERNATIVES = new Set([100701, 900701]);

type ExtractSkillsOptions = {
  replaceMode: boolean;
  dbPath?: string;
};

function parseCliArgs(argv: Array<string>): ExtractSkillsOptions {
  const program = new Command();

  program
    .name('extract-skills')
    .description('Extract unified skill data from master.mdb')
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

function patchModifier(id: number, value: number): number {
  if (SCENARIO_SKILLS.has(id)) {
    return value * 1.2;
  }
  return value;
}

function buildEffects(
  row: SkillRow,
  prefix: '1' | '2',
): Array<SkillEffect> {
  const effects: Array<SkillEffect> = [];

  if (prefix === '1') {
    effects.push({
      type: row.ability_type_1_1,
      modifier: patchModifier(row.id, row.float_ability_value_1_1),
      target: row.target_type_1_1 as ISkillTarget,
    });

    if (row.ability_type_1_2 !== 0) {
      effects.push({
        type: row.ability_type_1_2,
        modifier: patchModifier(row.id, row.float_ability_value_1_2),
        target: row.target_type_1_2 as ISkillTarget,
      });
    }

    if (row.ability_type_1_3 !== 0) {
      effects.push({
        type: row.ability_type_1_3,
        modifier: patchModifier(row.id, row.float_ability_value_1_3),
        target: row.target_type_1_3 as ISkillTarget,
      });
    }
  } else {
    effects.push({
      type: row.ability_type_2_1,
      modifier: patchModifier(row.id, row.float_ability_value_2_1),
      target: row.target_type_2_1 as ISkillTarget,
    });

    if (row.ability_type_2_2 !== 0) {
      effects.push({
        type: row.ability_type_2_2,
        modifier: patchModifier(row.id, row.float_ability_value_2_2),
        target: row.target_type_2_2 as ISkillTarget,
      });
    }

    if (row.ability_type_2_3 !== 0) {
      effects.push({
        type: row.ability_type_2_3,
        modifier: patchModifier(row.id, row.float_ability_value_2_3),
        target: row.target_type_2_3 as ISkillTarget,
      });
    }
  }

  return effects;
}

function buildAlternatives(row: SkillRow): Array<SkillAlternative> {
  const alternatives: Array<SkillAlternative> = [
    {
      precondition: '',
      condition: row.condition_1,
      baseDuration: row.float_ability_time_1,
      effects: buildEffects(row, '1'),
    },
  ];

  if (row.condition_2 && row.condition_2 !== '' && row.condition_2 !== '0') {
    alternatives.push({
      precondition: '',
      condition: row.condition_2,
      baseDuration: row.float_ability_time_2,
      effects: buildEffects(row, '2'),
    });
  }

  return alternatives;
}

async function extractSkills(options: ExtractSkillsOptions = { replaceMode: false }) {
  console.log('📖 Extracting unified skills...\n');

  const { replaceMode, dbPath: cliDbPath } = options;
  const dbPath = await resolveMasterDbPath(cliDbPath);

  console.log(
    `Mode: ${replaceMode ? '⚠️  Full Replacement' : '✓ Merge (preserves future content)'}`,
  );
  console.log(`Database: ${dbPath}\n`);

  const db = openDatabase(dbPath);

  try {
    const rows = queryAll<SkillRow>(
      db,
      `SELECT s.id, s.rarity,
              s.condition_1,
              s.float_ability_time_1,
              s.ability_type_1_1, s.float_ability_value_1_1, s.target_type_1_1,
              s.ability_type_1_2, s.float_ability_value_1_2, s.target_type_1_2,
              s.ability_type_1_3, s.float_ability_value_1_3, s.target_type_1_3,
              s.condition_2,
              s.float_ability_time_2,
              s.ability_type_2_1, s.float_ability_value_2_1, s.target_type_2_1,
              s.ability_type_2_2, s.float_ability_value_2_2, s.target_type_2_2,
              s.ability_type_2_3, s.float_ability_value_2_3, s.target_type_2_3,
              s.group_id, s.icon_id, COALESCE(sp.need_skill_point, 0) as need_skill_point, s.disp_order
       FROM skill_data s
       LEFT JOIN single_mode_skill_need_point sp ON s.id = sp.id`,
    );

    const nameRows = queryAll<SkillNameRow>(
      db,
      `SELECT [index], text
       FROM text_data
       WHERE category = 47`,
    );

    console.log(`Found ${rows.length} skill records`);
    console.log(`Found ${nameRows.length} skill names\n`);

    const namesById: Record<string, string> = {};
    for (const row of nameRows) {
      namesById[row.index.toString()] = row.text;
    }

    const extractedSkills: Record<string, SkillEntry> = {};

    for (const row of rows) {
      const alternatives = buildAlternatives(row);
      const name = namesById[row.id.toString()] ?? '';
      const baseEntry: Omit<SkillEntry, 'alternatives'> = {
        rarity: row.rarity,
        groupId: row.group_id,
        iconId: row.icon_id.toString(),
        baseCost: row.need_skill_point,
        order: row.disp_order,
        name,
        source: 'master',
      };

      if (SPLIT_ALTERNATIVES.has(row.id)) {
        alternatives.forEach((alt, index) => {
          const suffix = index === 0 ? '' : `-${index}`;
          const key = `${row.id}${suffix}`;
          extractedSkills[key] = {
            ...baseEntry,
            alternatives: [alt],
          };
        });
      } else {
        extractedSkills[row.id.toString()] = {
          ...baseEntry,
          alternatives,
        };
      }
    }

    const outputPath = path.join(process.cwd(), 'src/modules/data/skills.json');

    let finalSkills: Record<string, SkillEntry>;
    if (replaceMode) {
      finalSkills = extractedSkills;
      console.log(
        `\n⚠️  Full replacement mode: ${Object.keys(extractedSkills).length} skills from master.mdb only`,
      );
    } else {
      const existingData = await readJsonFileIfExists<Record<string, SkillEntry>>(outputPath);
      if (existingData) {
        const newCount = Object.keys(extractedSkills).length;
        finalSkills = { ...existingData, ...extractedSkills };
        const finalCount = Object.keys(finalSkills).length;
        const preserved = finalCount - newCount;

        console.log('\n✓ Merge mode:');
        console.log(`  → ${newCount} skills from master.mdb (current content)`);
        console.log(`  → ${preserved} additional skills preserved (future content)`);
        console.log(`  → ${finalCount} total skills`);
      } else {
        finalSkills = extractedSkills;
        console.log('\n✓ No existing file found, using master.mdb data only');
      }
    }

    const sorted = sortByNumericKey(finalSkills);
    await writeJsonFile(outputPath, sorted);
    console.log(`\n✓ Written to ${outputPath}`);
  } finally {
    closeDatabase(db);
  }
}

if (import.meta.main) {
  const options = parseCliArgs(process.argv);

  extractSkills(options).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}

export { extractSkills, parseCliArgs };
