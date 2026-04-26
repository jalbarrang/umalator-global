# Master MDB Extension

Project-local pi extension for reading `db/master.mdb` without inline Node, Python, or shell one-liners.

## What it adds

- Tool: `master_mdb_query`
- Command: `/mdb-query`

## Database path

This extension only reads the project-local database:

```text
db/master.mdb
```

If it is missing, fetch it with:

```bash
pnpm run db:fetch
```

## Safety model

- Opens SQLite with Bun's built-in `bun:sqlite` in readonly mode.
- Enables SQLite `query_only` mode.
- Allows only:
  - `SELECT ...`
  - `WITH ... SELECT ...`
  - safe schema PRAGMA reads:
    - `table_info`
    - `table_xinfo`
    - `index_list`
    - `index_info`
    - `index_xinfo`
    - `foreign_key_list`
    - `database_list`
- Rejects mutation statements, multi-statement input, `ATTACH`, `VACUUM`, `load_extension`, and other non-read operations.
- Caps returned rows; narrow queries with `WHERE` and `LIMIT` are preferred.

## Examples

```text
/mdb-query SELECT name FROM sqlite_master WHERE type = "table" ORDER BY name LIMIT 20
/mdb-query PRAGMA table_info(text_data)
/mdb-query SELECT [index], text FROM text_data WHERE category = 6 LIMIT 10
```

Agent-facing examples:

```text
List the master.mdb tables related to skills.
Inspect the text_data schema in master.mdb.
Find category 6 names in text_data.
```

Pi should use `master_mdb_query` for these instead of terminal inline Node snippets.
