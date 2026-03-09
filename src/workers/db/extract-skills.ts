import type { ISkillTarget } from '@/lib/sunday-tools/skills/definitions';
import type { SkillEntry, SkillsMap } from '@/modules/data/skill-types';

type SqlRow = Record<string, SqlValue>;
type SqlValue = number | string | Uint8Array | null;

interface SqlStatement {
  bind: (params: Array<SqlValue>) => void;
  step: () => boolean;
  getAsObject: () => Record<string, SqlValue>;
  free: () => void;
}

interface SqlDatabase {
  prepare: (sql: string) => SqlStatement;
}

interface SkillRow {
  id: number;
  rarity: number;
  precondition_1: string;
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
  precondition_2: string;
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
  210052,
  210061,
  210062,
  210071,
  210072,
  210081,
  210082,
  210261,
  210262,
  210271,
  210272,
  210281,
  210282,
  210291,
]);

const SPLIT_ALTERNATIVES = new Set([100701, 900701]);

function queryAll(db: SqlDatabase, sql: string, params: Array<SqlValue> = []): Array<SqlRow> {
  const statement = db.prepare(sql);
  try {
    if (params.length > 0) {
      statement.bind(params);
    }

    const rows: Array<SqlRow> = [];
    while (statement.step()) {
      rows.push(statement.getAsObject() as SqlRow);
    }
    return rows;
  } finally {
    statement.free();
  }
}

function numberFromSql(value: SqlValue, field: string, fallback = 0): number {
  if (value === null) {
    return fallback;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  throw new Error(`Invalid numeric value for ${field}`);
}

function stringFromSql(value: SqlValue, field: string, fallback = ''): string {
  if (value === null) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  throw new Error(`Invalid string value for ${field}`);
}

function parseSkillRow(row: SqlRow): SkillRow {
  return {
    id: numberFromSql(row.id, 'id'),
    rarity: numberFromSql(row.rarity, 'rarity'),
    precondition_1: stringFromSql(row.precondition_1, 'precondition_1'),
    condition_1: stringFromSql(row.condition_1, 'condition_1'),
    float_ability_time_1: numberFromSql(row.float_ability_time_1, 'float_ability_time_1'),
    ability_type_1_1: numberFromSql(row.ability_type_1_1, 'ability_type_1_1'),
    float_ability_value_1_1: numberFromSql(row.float_ability_value_1_1, 'float_ability_value_1_1'),
    target_type_1_1: numberFromSql(row.target_type_1_1, 'target_type_1_1'),
    ability_type_1_2: numberFromSql(row.ability_type_1_2, 'ability_type_1_2'),
    float_ability_value_1_2: numberFromSql(row.float_ability_value_1_2, 'float_ability_value_1_2'),
    target_type_1_2: numberFromSql(row.target_type_1_2, 'target_type_1_2'),
    ability_type_1_3: numberFromSql(row.ability_type_1_3, 'ability_type_1_3'),
    float_ability_value_1_3: numberFromSql(row.float_ability_value_1_3, 'float_ability_value_1_3'),
    target_type_1_3: numberFromSql(row.target_type_1_3, 'target_type_1_3'),
    precondition_2: stringFromSql(row.precondition_2, 'precondition_2'),
    condition_2: stringFromSql(row.condition_2, 'condition_2'),
    float_ability_time_2: numberFromSql(row.float_ability_time_2, 'float_ability_time_2'),
    ability_type_2_1: numberFromSql(row.ability_type_2_1, 'ability_type_2_1'),
    float_ability_value_2_1: numberFromSql(row.float_ability_value_2_1, 'float_ability_value_2_1'),
    target_type_2_1: numberFromSql(row.target_type_2_1, 'target_type_2_1'),
    ability_type_2_2: numberFromSql(row.ability_type_2_2, 'ability_type_2_2'),
    float_ability_value_2_2: numberFromSql(row.float_ability_value_2_2, 'float_ability_value_2_2'),
    target_type_2_2: numberFromSql(row.target_type_2_2, 'target_type_2_2'),
    ability_type_2_3: numberFromSql(row.ability_type_2_3, 'ability_type_2_3'),
    float_ability_value_2_3: numberFromSql(row.float_ability_value_2_3, 'float_ability_value_2_3'),
    target_type_2_3: numberFromSql(row.target_type_2_3, 'target_type_2_3'),
    group_id: numberFromSql(row.group_id, 'group_id'),
    icon_id: numberFromSql(row.icon_id, 'icon_id'),
    need_skill_point: numberFromSql(row.need_skill_point, 'need_skill_point'),
    disp_order: numberFromSql(row.disp_order, 'disp_order'),
  };
}

function patchModifier(id: number, value: number): number {
  if (SCENARIO_SKILLS.has(id)) {
    return value * 1.2;
  }
  return value;
}

function buildEffects(row: SkillRow, prefix: '1' | '2'): Array<SkillEffect> {
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

function sortByNumericKey<T>(input: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(input).sort(([a], [b]) => Number.parseFloat(a) - Number.parseFloat(b)),
  );
}

export function extractSkills(db: SqlDatabase): SkillsMap {
  const skillRows = queryAll(
    db,
    `SELECT s.id, s.rarity,
            s.precondition_1,
            s.condition_1,
            s.float_ability_time_1,
            s.ability_type_1_1, s.float_ability_value_1_1, s.target_type_1_1,
            s.ability_type_1_2, s.float_ability_value_1_2, s.target_type_1_2,
            s.ability_type_1_3, s.float_ability_value_1_3, s.target_type_1_3,
            s.precondition_2,
            s.condition_2,
            s.float_ability_time_2,
            s.ability_type_2_1, s.float_ability_value_2_1, s.target_type_2_1,
            s.ability_type_2_2, s.float_ability_value_2_2, s.target_type_2_2,
            s.ability_type_2_3, s.float_ability_value_2_3, s.target_type_2_3,
            s.group_id, s.icon_id, COALESCE(sp.need_skill_point, 0) as need_skill_point, s.disp_order
     FROM skill_data s
     LEFT JOIN single_mode_skill_need_point sp ON s.id = sp.id`,
  );

  const skillNameRows = queryAll(
    db,
    `SELECT [index], text
     FROM text_data
     WHERE category = 47`,
  );

  const namesById: Record<string, string> = {};
  for (const row of skillNameRows) {
    const skillId = numberFromSql(row.index, 'index');
    namesById[skillId.toString()] = stringFromSql(row.text, 'text');
  }

  const extractedSkills: SkillsMap = {};

  for (const rawRow of skillRows) {
    const row = parseSkillRow(rawRow);
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
      alternatives.forEach((alternative, index) => {
        const suffix = index === 0 ? '' : `-${index}`;
        const key = `${row.id}${suffix}`;
        extractedSkills[key] = {
          ...baseEntry,
          alternatives: [alternative],
        };
      });
      continue;
    }

    extractedSkills[row.id.toString()] = {
      ...baseEntry,
      alternatives,
    };
  }

  return sortByNumericKey(extractedSkills) as SkillsMap;
}
