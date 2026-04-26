import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ExtensionAPI, ExtensionCommandContext } from '@mariozechner/pi-coding-agent';
import { Type } from '@sinclair/typebox';

type QueryParams = Array<unknown> | Record<string, unknown>;

type MasterMdbQueryInput = {
  sql: string;
  params?: QueryParams;
  maxRows?: number;
};

type QueryResult = {
  dbPath: string;
  sql: string;
  params?: QueryParams;
  columns: Array<string>;
  rows: Array<Record<string, unknown>>;
  shownRows: number;
  truncated: boolean;
  maxRows: number;
};

const DEFAULT_MAX_ROWS = 50;
const HARD_MAX_ROWS = 500;

const MasterMdbQueryParams = Type.Object({
  sql: Type.String({
    description:
      'Read-only SQL against project-local db/master.mdb. Allowed: SELECT/WITH SELECT and safe schema PRAGMA reads.'
  }),
  params: Type.Optional(
    Type.Any({
      description:
        'Optional SQLite bind parameters: array for positional ? params or object for named params.'
    }),
  ),
  maxRows: Type.Optional(
    Type.Integer({
      minimum: 1,
      maximum: HARD_MAX_ROWS,
      description: `Maximum rows to return. Defaults to ${DEFAULT_MAX_ROWS}; hard max ${HARD_MAX_ROWS}.`,
    }),
  ),
});

function getDbPath(cwd: string): string {
  return resolve(cwd, 'db/master.mdb');
}

function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n\r]*/g, ' ')
    .trim();
}

function withoutTrailingSemicolon(sql: string): string {
  return sql.replace(/;\s*$/u, '').trim();
}

function assertSafeReadOnlySql(sql: string): string {
  const stripped = stripSqlComments(sql);
  const singleStatement = withoutTrailingSemicolon(stripped);

  if (!singleStatement) {
    throw new Error('SQL is empty.');
  }

  if (singleStatement.includes(';')) {
    throw new Error('Only one SQL statement is allowed. Remove extra semicolons/statements.');
  }

  const normalized = singleStatement.replace(/\s+/g, ' ').trim().toLowerCase();
  const forbidden = /\b(insert|update|delete|replace|alter|drop|create|attach|detach|vacuum|reindex|analyze|begin|commit|rollback|savepoint|release)\b|load_extension\s*\(/iu;

  if (forbidden.test(normalized)) {
    throw new Error('Only read-only SELECT/WITH queries and safe schema PRAGMA reads are allowed.');
  }

  if (normalized.startsWith('select ')) {
    return singleStatement;
  }

  if (normalized.startsWith('with ')) {
    if (!/\bselect\b/iu.test(normalized)) {
      throw new Error('WITH queries must contain a SELECT.');
    }
    return singleStatement;
  }

  if (normalized.startsWith('pragma ')) {
    const allowedPragma = /^pragma\s+(main\.)?(table_info|table_xinfo|index_list|index_info|index_xinfo|foreign_key_list|database_list)\s*(\(|$)/iu;
    if (allowedPragma.test(normalized)) {
      return singleStatement;
    }
    throw new Error(
      'Only safe schema PRAGMA reads are allowed: table_info, table_xinfo, index_list, index_info, index_xinfo, foreign_key_list, database_list.',
    );
  }

  throw new Error('SQL must start with SELECT, WITH, or a safe schema PRAGMA.');
}

function normalizeMaxRows(maxRows: number | undefined): number {
  if (typeof maxRows !== 'number' || !Number.isInteger(maxRows)) return DEFAULT_MAX_ROWS;
  return Math.max(1, Math.min(maxRows, HARD_MAX_ROWS));
}

function normalizeParams(params: unknown): QueryParams | undefined {
  if (params === undefined || params === null) return undefined;
  if (Array.isArray(params)) return params;
  if (typeof params === 'object') return params as Record<string, unknown>;
  throw new Error('params must be an array, object, null, or omitted.');
}

async function runMasterMdbQuery(cwd: string, input: MasterMdbQueryInput): Promise<QueryResult> {
  const dbPath = getDbPath(cwd);
  if (!existsSync(dbPath)) {
    throw new Error(`master.mdb not found at ${dbPath}. Fetch it with pnpm run db:fetch.`);
  }

  const sql = assertSafeReadOnlySql(input.sql);
  const params = normalizeParams(input.params);
  const maxRows = normalizeMaxRows(input.maxRows);

  const { Database: BunDatabase } = (await import('bun:sqlite')) as {
    Database: new (filename: string, options?: { readonly?: boolean; create?: boolean }) => {
      query: (query: string) => {
        all: (...params: Array<unknown>) => Array<Record<string, unknown>>;
      };
      close: () => void;
    };
  };

  const db = new BunDatabase(dbPath, { readonly: true, create: false });

  try {
    db.query('PRAGMA query_only = ON').all();
    const statement = db.query(sql);
    const boundParams = Array.isArray(params) ? params : params === undefined ? [] : [params];
    const fetchedRows = statement.all(...boundParams);
    const truncated = fetchedRows.length > maxRows;
    const rows = fetchedRows.slice(0, maxRows);
    const columns = rows.length > 0 ? Object.keys(rows[0] ?? {}) : [];

    return {
      dbPath,
      sql,
      params,
      columns,
      rows,
      shownRows: rows.length,
      truncated,
      maxRows,
    };
  } finally {
    db.close();
  }
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value.length > 160 ? `${value.slice(0, 157)}…` : value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function formatQueryResult(result: QueryResult): string {
  const lines: Array<string> = [
    `master.mdb query: ${result.shownRows} row(s) shown${result.truncated ? ` (truncated at ${result.maxRows})` : ''}`,
    `Database: ${result.dbPath}`,
    `Columns: ${result.columns.length > 0 ? result.columns.join(', ') : '(none)'}`,
  ];

  if (result.rows.length === 0) {
    lines.push('No rows returned.');
    return lines.join('\n');
  }

  for (const [index, row] of result.rows.entries()) {
    const cells = result.columns.map((column) => `${column}=${formatValue(row[column])}`).join(' | ');
    lines.push(`${index + 1}. ${cells}`);
  }

  if (result.truncated) {
    lines.push(`Result truncated. Re-run with a narrower WHERE clause or LIMIT; maxRows was ${result.maxRows}.`);
  }

  return lines.join('\n');
}

async function runCommandQuery(pi: ExtensionAPI, ctx: ExtensionCommandContext, sql: string) {
  if (!sql.trim()) {
    pi.sendMessage({
      customType: 'master-mdb-query',
      content: getHelpText(),
      details: { mode: 'help' },
      display: true,
    });
    return;
  }

  try {
    const result = await runMasterMdbQuery(ctx.cwd, { sql });
    pi.sendMessage({
      customType: 'master-mdb-query',
      content: formatQueryResult(result),
      details: result,
      display: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    pi.sendMessage({
      customType: 'master-mdb-query',
      content: `master.mdb query failed: ${message}`,
      details: { error: message },
      display: true,
    });
  }
}

function getHelpText(): string {
  return [
    'Usage: /mdb-query <SELECT-or-safe-PRAGMA>',
    '',
    'Examples:',
    '  /mdb-query SELECT name FROM sqlite_master WHERE type = "table" ORDER BY name LIMIT 20',
    '  /mdb-query PRAGMA table_info(text_data)',
    '  /mdb-query SELECT [index], text FROM text_data WHERE category = 6 LIMIT 10',
    '',
    'Safety: db/master.mdb only, readonly connection, SELECT/WITH SELECT and safe schema PRAGMAs only.',
  ].join('\n');
}

export default function masterMdbExtension(pi: ExtensionAPI) {
  pi.registerTool({
    name: 'master_mdb_query',
    label: 'Master MDB Query',
    description:
      'Run safe read-only SQL against project-local db/master.mdb using Bun sqlite. Allows SELECT/WITH SELECT and safe schema PRAGMA introspection only.',
    promptSnippet: 'Query project-local db/master.mdb with safe readonly SQL using Bun sqlite.',
    promptGuidelines: [
      'Use master_mdb_query instead of bash, sqlite3 CLI, inline node, inline python, or ad-hoc terminal one-liners when reading db/master.mdb.',
      'Use master_mdb_query for master.mdb schema inspection, table lookup, and bounded SELECT queries.',
      'Keep master_mdb_query queries narrow: inspect schema first, add WHERE/LIMIT clauses, and request only columns needed for the user answer.',
    ],
    parameters: MasterMdbQueryParams,

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = await runMasterMdbQuery(ctx.cwd, params as MasterMdbQueryInput);
      return {
        content: [{ type: 'text', text: formatQueryResult(result) }],
        details: result,
      };
    },
  });

  pi.registerCommand('mdb-query', {
    description: 'Run safe read-only SQL against project-local db/master.mdb',
    getArgumentCompletions: (prefix) => {
      const suggestions = [
        'SELECT name FROM sqlite_master WHERE type = "table" ORDER BY name LIMIT 20',
        'PRAGMA table_info(text_data)',
        'SELECT [index], text FROM text_data WHERE category = 6 LIMIT 10',
      ];
      const filtered = suggestions.filter((item) => item.toLowerCase().startsWith(prefix.toLowerCase()));
      return filtered.length > 0 ? filtered.map((item) => ({ value: item, label: item })) : null;
    },
    handler: async (args, ctx) => {
      await runCommandQuery(pi, ctx, args.trim());
    },
  });
}
