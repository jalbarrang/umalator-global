import type { SkillsMap } from '@/modules/data/skill-types';
import type { UmasMap } from './storage';

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

function sortByNumericKey<T>(input: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(input).sort(([a], [b]) => Number.parseFloat(a) - Number.parseFloat(b)),
  );
}

/**
 * Formula from make_global_uma_info.pl:
 * 100000 + 10000 * (v - 1) + i * 10 + 1
 * where i = middle digits, v = last 2 digits
 */
export function uniqueSkillForOutfit(outfitId: number): number {
  const outfitIdStr = outfitId.toString();
  const i = Number.parseInt(outfitIdStr.substring(1, outfitIdStr.length - 2), 10);
  const v = Number.parseInt(outfitIdStr.substring(outfitIdStr.length - 2), 10);
  return 100000 + 10000 * (v - 1) + i * 10 + 1;
}

export function extractUmas(db: SqlDatabase, skills: SkillsMap): UmasMap {
  const umaRows = queryAll(
    db,
    `SELECT [index], text
     FROM text_data
     WHERE category = 6 AND [index] < 2000`,
  );

  const umas: UmasMap = {};

  for (const umaRow of umaRows) {
    const umaId = numberFromSql(umaRow.index, 'index');
    const umaName = stringFromSql(umaRow.text, 'text');

    const minOutfitIndex = umaId * 100;
    const maxOutfitIndex = (umaId + 1) * 100;
    const outfitRows = queryAll(
      db,
      `SELECT [index], text
       FROM text_data
       WHERE category = 5
         AND [index] BETWEEN ? AND ?
       ORDER BY [index] ASC`,
      [minOutfitIndex, maxOutfitIndex],
    );

    const outfits: Record<string, string> = {};
    for (const outfitRow of outfitRows) {
      const outfitId = numberFromSql(outfitRow.index, 'index');
      const epithet = stringFromSql(outfitRow.text, 'text');
      const skillId = uniqueSkillForOutfit(outfitId);

      if (skills[skillId.toString()]) {
        outfits[outfitId.toString()] = epithet;
      }
    }

    if (Object.keys(outfits).length > 0) {
      umas[umaId.toString()] = {
        name: ['', umaName],
        outfits,
      };
    }
  }

  return sortByNumericKey(umas) as UmasMap;
}
