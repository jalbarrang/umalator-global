#!/usr/bin/env node
/**
 * Extract unified skill data from master.mdb
 * Combines metadata, names, and activation/effect data into one file.
 */

import path from 'node:path';
import { Command } from 'commander';
import { closeDatabase, openDatabase, queryAll } from './lib/database';
import {
  readJsonFileIfExists,
  resolveMasterDbPath,
  sortByNumericKey,
  writeJsonFile,
} from './lib/shared';
import type { SkillEntry } from '../src/modules/data/skills';
import type { ISkillTarget } from '@/lib/sunday-tools/skills/definitions';

interface SkillRow {
  id: number;
  rarity: number;
  precondition_1: string;
  condition_1: string;
  float_ability_time_1: number;
  ability_type_1_1: number;
  float_ability_value_1_1: number;
  target_type_1_1: number;
  ability_value_usage_1_1: number;
  ability_value_level_usage_1_1: number;
  ability_type_1_2: number;
  float_ability_value_1_2: number;
  target_type_1_2: number;
  ability_value_usage_1_2: number;
  ability_value_level_usage_1_2: number;
  ability_type_1_3: number;
  float_ability_value_1_3: number;
  target_type_1_3: number;
  ability_value_usage_1_3: number;
  ability_value_level_usage_1_3: number;
  precondition_2: string;
  condition_2: string;
  float_ability_time_2: number;
  ability_type_2_1: number;
  float_ability_value_2_1: number;
  target_type_2_1: number;
  ability_value_usage_2_1: number;
  ability_value_level_usage_2_1: number;
  ability_type_2_2: number;
  float_ability_value_2_2: number;
  target_type_2_2: number;
  ability_value_usage_2_2: number;
  ability_value_level_usage_2_2: number;
  ability_type_2_3: number;
  float_ability_value_2_3: number;
  target_type_2_3: number;
  ability_value_usage_2_3: number;
  ability_value_level_usage_2_3: number;
  group_id: number;
  icon_id: number;
  need_skill_point: number;
  disp_order: number;
}

interface SkillNameRow {
  index: number;
  text: string;
}

interface UniqueSkillOwnerRow {
  skillId: number;
  outfitId: number;
}

interface GeneVersionRow {
  unique_id: number;
  gene_id: number;
}

type SkillEffect = {
  type: number;
  modifier: number;
  target: ISkillTarget;
  valueUsage?: number;
  valueLevelUsage?: number;
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

const EXCLUDED_SKILLS = new Set([
  // Narita Brian's Story
  300011, 300021,
  // Silence Suzuka's Story
  300031, 300041, 300051, 300061, 300071, 300081, 300091, 300101,
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

function createEffect(
  skillId: number,
  type: number,
  modifier: number,
  target: number,
  valueUsage: number,
  valueLevelUsage: number,
): SkillEffect {
  return {
    type,
    modifier: patchModifier(skillId, modifier),
    target: target as ISkillTarget,
    valueUsage,
    valueLevelUsage,
  };
}

function buildEffects(row: SkillRow, prefix: '1' | '2'): Array<SkillEffect> {
  const effects: Array<SkillEffect> = [];

  if (prefix === '1') {
    effects.push(
      createEffect(
        row.id,
        row.ability_type_1_1,
        row.float_ability_value_1_1,
        row.target_type_1_1,
        row.ability_value_usage_1_1,
        row.ability_value_level_usage_1_1,
      ),
    );

    if (row.ability_type_1_2 !== 0) {
      effects.push(
        createEffect(
          row.id,
          row.ability_type_1_2,
          row.float_ability_value_1_2,
          row.target_type_1_2,
          row.ability_value_usage_1_2,
          row.ability_value_level_usage_1_2,
        ),
      );
    }

    if (row.ability_type_1_3 !== 0) {
      effects.push(
        createEffect(
          row.id,
          row.ability_type_1_3,
          row.float_ability_value_1_3,
          row.target_type_1_3,
          row.ability_value_usage_1_3,
          row.ability_value_level_usage_1_3,
        ),
      );
    }
  } else {
    effects.push(
      createEffect(
        row.id,
        row.ability_type_2_1,
        row.float_ability_value_2_1,
        row.target_type_2_1,
        row.ability_value_usage_2_1,
        row.ability_value_level_usage_2_1,
      ),
    );

    if (row.ability_type_2_2 !== 0) {
      effects.push(
        createEffect(
          row.id,
          row.ability_type_2_2,
          row.float_ability_value_2_2,
          row.target_type_2_2,
          row.ability_value_usage_2_2,
          row.ability_value_level_usage_2_2,
        ),
      );
    }

    if (row.ability_type_2_3 !== 0) {
      effects.push(
        createEffect(
          row.id,
          row.ability_type_2_3,
          row.float_ability_value_2_3,
          row.target_type_2_3,
          row.ability_value_usage_2_3,
          row.ability_value_level_usage_2_3,
        ),
      );
    }
  }

  return effects;
}

function buildAlternatives(row: SkillRow): Array<SkillAlternative> {
  const alternatives: Array<SkillAlternative> = [
    {
      precondition: row.precondition_1 === '0' ? '' : row.precondition_1,
      condition: row.condition_1,
      baseDuration: row.float_ability_time_1,
      effects: buildEffects(row, '1'),
    },
  ];

  if (row.condition_2 && row.condition_2 !== '' && row.condition_2 !== '0') {
    alternatives.push({
      precondition: row.precondition_2 === '0' ? '' : row.precondition_2,
      condition: row.condition_2,
      baseDuration: row.float_ability_time_2,
      effects: buildEffects(row, '2'),
    });
  }

  return alternatives;
}

function isConcreteOutfitId(outfitId: number): boolean {
  return outfitId >= 100000;
}

function reduceUniqueSkillOwners(rows: Array<UniqueSkillOwnerRow>): Map<string, number> {
  const owners = new Map<string, number>();

  for (const row of rows) {
    // Base rarity uniques sometimes point at placeholder dress ids like 101.
    // Only keep concrete outfit ids because runtime ownership checks use full outfit ids.
    if (!isConcreteOutfitId(row.outfitId)) {
      continue;
    }

    const skillId = row.skillId.toString();
    const currentOwner = owners.get(skillId);

    if (currentOwner === undefined || row.outfitId < currentOwner) {
      owners.set(skillId, row.outfitId);
    }
  }

  return owners;
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
              s.precondition_1,
              s.condition_1,
              s.float_ability_time_1,
              s.ability_type_1_1, s.float_ability_value_1_1, s.target_type_1_1,
              s.ability_value_usage_1_1, s.ability_value_level_usage_1_1,
              s.ability_type_1_2, s.float_ability_value_1_2, s.target_type_1_2,
              s.ability_value_usage_1_2, s.ability_value_level_usage_1_2,
              s.ability_type_1_3, s.float_ability_value_1_3, s.target_type_1_3,
              s.ability_value_usage_1_3, s.ability_value_level_usage_1_3,
              s.precondition_2,
              s.condition_2,
              s.float_ability_time_2,
              s.ability_type_2_1, s.float_ability_value_2_1, s.target_type_2_1,
              s.ability_value_usage_2_1, s.ability_value_level_usage_2_1,
              s.ability_type_2_2, s.float_ability_value_2_2, s.target_type_2_2,
              s.ability_value_usage_2_2, s.ability_value_level_usage_2_2,
              s.ability_type_2_3, s.float_ability_value_2_3, s.target_type_2_3,
              s.ability_value_usage_2_3, s.ability_value_level_usage_2_3,
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
      if (EXCLUDED_SKILLS.has(row.id)) {
        continue;
      }

      const alternatives = buildAlternatives(row);
      const name = namesById[row.id.toString()] ?? '';
      const baseEntry: Omit<SkillEntry, 'alternatives'> = {
        id: row.id.toString(),
        rarity: row.rarity,
        groupId: row.group_id,
        versions: [],
        iconId: row.icon_id.toString(),
        baseCost: row.need_skill_point,
        order: row.disp_order,
        name,
        character: [],
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

    const uniqueSkillOwnerRows = queryAll<UniqueSkillOwnerRow>(
      db,
      `WITH skill_slots AS (
         SELECT id AS skill_set_id, skill_id1 AS skill_id FROM skill_set WHERE skill_id1 <> 0
         UNION ALL SELECT id, skill_id2 FROM skill_set WHERE skill_id2 <> 0
         UNION ALL SELECT id, skill_id3 FROM skill_set WHERE skill_id3 <> 0
         UNION ALL SELECT id, skill_id4 FROM skill_set WHERE skill_id4 <> 0
         UNION ALL SELECT id, skill_id5 FROM skill_set WHERE skill_id5 <> 0
         UNION ALL SELECT id, skill_id6 FROM skill_set WHERE skill_id6 <> 0
         UNION ALL SELECT id, skill_id7 FROM skill_set WHERE skill_id7 <> 0
         UNION ALL SELECT id, skill_id8 FROM skill_set WHERE skill_id8 <> 0
         UNION ALL SELECT id, skill_id9 FROM skill_set WHERE skill_id9 <> 0
         UNION ALL SELECT id, skill_id10 FROM skill_set WHERE skill_id10 <> 0
       )
       SELECT DISTINCT
         sd.id AS skillId,
         crd.card_id AS outfitId
       FROM card_rarity_data crd
       JOIN card_data cd
         ON cd.id = crd.card_id
       JOIN skill_slots ss
         ON ss.skill_set_id = crd.skill_set
       JOIN skill_data sd
         ON sd.id = ss.skill_id
       WHERE sd.rarity = 5`,
    );
    const uniqueSkillOwners = reduceUniqueSkillOwners(uniqueSkillOwnerRows);
    let ownerCount = 0;

    for (const [skillId, outfitId] of uniqueSkillOwners) {
      const skill = extractedSkills[skillId];
      if (!skill) {
        continue;
      }

      // Only unique skills are safe to tie to a single uma outfit.
      skill.character = [outfitId];
      ownerCount++;
    }

    console.log(`Mapped ${ownerCount} unique skills to owning outfits`);

    const geneVersionRows = queryAll<GeneVersionRow>(
      db,
      `SELECT u.id AS unique_id, g.id AS gene_id
       FROM skill_data u
       JOIN skill_data g ON g.id = u.id + 800000
       WHERE u.rarity IN (4, 5)
         AND g.rarity = 1`,
    );

    for (const row of geneVersionRows) {
      const uniqueSkill = extractedSkills[row.unique_id.toString()];
      const geneSkill = extractedSkills[row.gene_id.toString()];
      if (uniqueSkill) {
        uniqueSkill.gene_version = { id: row.gene_id };
      }
      if (geneSkill && uniqueSkill) {
        geneSkill.character = [...uniqueSkill.character];
      }
    }

    console.log(`Mapped ${geneVersionRows.length} gene versions to unique skills`);

    const groupMap = new Map<number, Set<string>>();
    for (const skill of Object.values(extractedSkills)) {
      const members = groupMap.get(skill.groupId) ?? new Set<string>();
      members.add(skill.id);
      groupMap.set(skill.groupId, members);
    }

    let familyCount = 0;
    let versionCount = 0;
    for (const membersSet of groupMap.values()) {
      const members = Array.from(membersSet);
      if (members.length < 2) {
        continue;
      }
      familyCount++;

      for (const id of members) {
        const skill = extractedSkills[id];
        if (skill) {
          skill.versions = members.filter((memberId) => memberId !== id).map(Number);
          versionCount++;
        }
      }
    }

    console.log(`Initialized ${familyCount} multi-member families (${versionCount} linked skills)`);

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

    for (const skill of Object.values(finalSkills)) {
      if (!Array.isArray(skill.versions)) {
        skill.versions = [];
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
