#!/usr/bin/env node
/**
 * Extract denormalized support card data from master.mdb.
 */

import { Command } from 'commander';
import { closeDatabase, openDatabase, queryAll } from '../master-data/database';
import {
  readJsonFileIfExists,
  resolveMasterDbPath,
  sortByNumericKey,
  writeJsonFile
} from '../master-data/shared';

type SupportSkillEntry = {
  id: number;
  name: string;
  rarity: number;
};

type SupportCardEntry = {
  id: number;
  name: string;
  charaId: number;
  charaName: string;
  rarity: number;
  supportCardType: number;
  hintSkills: Array<SupportSkillEntry>;
  eventSkills: Array<SupportSkillEntry>;
};

type SupportCardsMap = Record<string, SupportCardEntry>;

type ExtractSupportCardsOptions = {
  replaceMode: boolean;
  dbPath?: string;
};

type SupportCardRow = {
  id: number;
  name: string | null;
  charaId: number;
  charaName: string | null;
  rarity: number;
  supportCardType: number;
};

type SupportSkillRow = {
  supportCardId: number;
  skillId: number;
  name: string | null;
  rarity: number;
};

function parseCliArgs(argv: Array<string>): ExtractSupportCardsOptions {
  const program = new Command();

  program
    .name('extract-support-cards')
    .description('Extract support card data from master.mdb')
    .option('-r, --replace', 'replace existing extracted data')
    .option('--full', 'alias for --replace')
    .argument('[dbPath]', 'path to master.mdb');

  program.parse(argv);

  const options = program.opts<{ replace?: boolean; full?: boolean }>();
  const [dbPath] = program.args as Array<string>;

  return {
    replaceMode: Boolean(options.replace || options.full),
    dbPath
  };
}

function skillComparator(a: SupportSkillEntry, b: SupportSkillEntry): number {
  return a.rarity - b.rarity || a.id - b.id;
}

function appendSkill(
  skillsByCard: Map<number, Array<SupportSkillEntry>>,
  supportCardId: number,
  skill: SupportSkillEntry
): void {
  const skills = skillsByCard.get(supportCardId) ?? [];
  if (!skills.some((existing) => existing.id === skill.id)) {
    skills.push(skill);
  }
  skillsByCard.set(supportCardId, skills);
}

function collectHintSkills(rows: Array<SupportSkillRow>): Map<number, Array<SupportSkillEntry>> {
  const skillsByCard = new Map<number, Array<SupportSkillEntry>>();

  for (const row of rows) {
    appendSkill(skillsByCard, row.supportCardId, {
      id: row.skillId,
      name: row.name ?? `Skill ${row.skillId}`,
      rarity: row.rarity
    });
  }

  for (const skills of skillsByCard.values()) {
    skills.sort(skillComparator);
  }

  return skillsByCard;
}

async function extractSupportCards(options: ExtractSupportCardsOptions = { replaceMode: false }) {
  const { replaceMode, dbPath: cliDbPath } = options;
  const dbPath = await resolveMasterDbPath(cliDbPath);
  const outputPath = 'src/modules/data/json/support-cards.json';

  console.log(`Opening database: ${dbPath}`);
  const db = openDatabase(dbPath);

  try {
    const existingData = replaceMode
      ? null
      : await readJsonFileIfExists<SupportCardsMap>(outputPath);

    const supportCards = queryAll<SupportCardRow>(
      db,
      `SELECT
         sc.id,
         COALESCE(card_name.text, '') AS name,
         sc.chara_id AS charaId,
         COALESCE(chara_name.text, '') AS charaName,
         sc.rarity,
         sc.support_card_type AS supportCardType
       FROM support_card_data sc
       LEFT JOIN text_data card_name
         ON card_name.category = 76 AND card_name."index" = sc.id
       LEFT JOIN text_data chara_name
         ON chara_name.category = 77 AND chara_name."index" = sc.id
       ORDER BY sc.id`
    );

    const hintSkillRows = queryAll<SupportSkillRow>(
      db,
      `SELECT DISTINCT
         hg.support_card_id AS supportCardId,
         hg.hint_value_1 AS skillId,
         skill_name.text AS name,
         sd.rarity
       FROM single_mode_hint_gain hg
       JOIN support_card_data sc
         ON sc.id = hg.support_card_id
        AND sc.skill_set_id = hg.hint_id
       JOIN skill_data sd
         ON sd.id = hg.hint_value_1
       LEFT JOIN text_data skill_name
         ON skill_name.category = 47 AND skill_name."index" = hg.hint_value_1
       WHERE hg.hint_gain_type = 0
       ORDER BY hg.support_card_id, hg.hint_group, hg.hint_value_1`
    );

    const hintSkillsByCard = collectHintSkills(hintSkillRows);
    const data: SupportCardsMap = existingData ? { ...existingData } : {};

    for (const row of supportCards) {
      const existing = data[String(row.id)];
      data[String(row.id)] = {
        id: row.id,
        name: row.name ?? existing?.name ?? '',
        charaId: row.charaId,
        charaName: row.charaName ?? existing?.charaName ?? '',
        rarity: row.rarity,
        supportCardType: row.supportCardType,
        hintSkills: hintSkillsByCard.get(row.id) ?? [],
        // Global master data exposes support-card event story metadata, but this
        // database snapshot does not include a story -> skill reward relation.
        // Keep the field in the schema so an external/manual mapping can be
        // merged later without changing consumers.
        eventSkills: existing?.eventSkills ?? []
      };
    }

    const eventSkillCount = Object.values(data).reduce(
      (sum, card) => sum + card.eventSkills.length,
      0
    );

    await writeJsonFile(outputPath, sortByNumericKey(data));

    console.log(`Wrote ${Object.keys(data).length} support cards to ${outputPath}`);
    console.log(`Mapped ${hintSkillRows.length} support card hint skill rows`);
    console.log(`Mapped ${eventSkillCount} support card event skills (preserved/extension data)`);
  } finally {
    closeDatabase(db);
  }
}

if (import.meta.main) {
  const options = parseCliArgs(process.argv);

  extractSupportCards(options).catch((error) => {
    console.error('Failed to extract support cards:', error.message);
    process.exit(1);
  });
}

export { extractSupportCards, parseCliArgs };
export type { SupportCardEntry, SupportCardsMap, SupportSkillEntry };
