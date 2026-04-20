# Data Extraction Scripts

TypeScript-based data extraction scripts using Node.js (`tsx`) and `better-sqlite3`. These scripts replace the legacy Perl scripts for extracting game data from `master.mdb`.

## Prerequisites

- **Node.js** (v24 or later)
- **pnpm** (project package manager)
- **master.mdb** - Game database file from Uma Musume installation
- **`courseeventparams/`** - required for `extract-course-data`
- **`extracted-data/course/`** - required for `extract-course-geometry`

## Quick Start

### Global snapshot update

```bash
pnpm run extract:all -- --snapshot global
pnpm run extract:course-geometry -- --snapshot global
```

This will:

- ✅ Update the checked-in runtime snapshot under `public/data/global/`
- ✅ Preserve future/datamined entries already present in that same snapshot directory when merge mode is used
- ✅ Rewrite `public/data/global/manifest.json`
- ✅ Automatically find `db/master.mdb` if it exists

### JP snapshot generation from an external MDB

The repo does **not** include a JP database. Generate JP data from your own external `master.mdb`:

```bash
UMALATOR_SNAPSHOT_VERSION=10004010 pnpm run extract:all -- --snapshot jp /path/to/master.mdb
UMALATOR_SNAPSHOT_VERSION=10004010 pnpm run extract:course-geometry -- --snapshot jp
```

Then provide a JP-specific `public/data/jp/tracknames.json` before committing or shipping the snapshot.

> There is currently no `tracknames` extraction script. Do **not** fake JP content by copying the Global file into `public/data/jp/`.

### Full replacement mode

```bash
pnpm run extract:all -- --snapshot global --replace
# or
pnpm run extract:all -- --snapshot global --full
```

## Snapshot Outputs

All runtime snapshot data now lives under `public/data/{snapshot}/`:

| File                   | Description                                   |
| ---------------------- | --------------------------------------------- |
| `manifest.json`        | Snapshot metadata + runtime file map          |
| `skills.json`          | Unified skill data (meta + names + mechanics) |
| `umas.json`            | Uma musume character data                     |
| `course_data.json`     | Course/track metadata + sections              |
| `tracknames.json`      | Track name translations                       |
| `course_geometry.json` | Geometry extracted from Unity YAML assets     |

`src/modules/data/*.json` still remains in the repo during the migration, but snapshot-aware scripts now write runtime data to `public/data/{snapshot}/`.

## Database Location

### Windows

Default path:

```
%APPDATA%\..\LocalLow\Cygames\Umamusume\master\master.mdb
```

### macOS / Linux (Steam/Proton)

```
~/.local/share/Steam/steamapps/compatdata/[AppID]/pfx/drive_c/users/steamuser/AppData/LocalLow/Cygames/Umamusume/master/master.mdb
```

### Local Database (Recommended)

Place `master.mdb` in a `db/` directory at the project root:

```
umalator-global/
├── db/
│   └── master.mdb
├── scripts/
└── ...
```

The extraction scripts automatically detect and use it.

### Custom Path

All extraction scripts accept a custom database path as the final positional argument:

```bash
pnpm run extract:skills -- --snapshot jp /path/to/master.mdb
pnpm run extract:all -- --snapshot jp /path/to/master.mdb
```

## Merge vs Replace Mode

### Merge Mode (Default) ✅

**What it does:**

- Reads the existing snapshot-local JSON files
- Updates entries that exist in `master.mdb`
- **Preserves** entries already staged in that snapshot directory but not present in the selected DB

**When to use:**

- Regular Global snapshot refreshes
- JP snapshot refreshes where you already have a staged snapshot directory
- Safe default for most workflows

### Replace Mode ⚠️

**What it does:**

- Replaces snapshot-local JSON files with only `master.mdb` content
- Removes snapshot-local future/datamined content

**When to use:**

- Fresh rebuilds
- Cleaning up corrupted snapshot data
- When you explicitly want only the selected database content

## Script Usage

### `extract-skills.ts`

Extracts unified skill data (metadata, names, and mechanics).

**Output:** `public/data/{snapshot}/skills.json`

```bash
pnpm run extract:skills -- --snapshot global
pnpm run extract:skills -- --snapshot jp /path/to/master.mdb
pnpm run extract:skills -- --snapshot global --replace
```

### `extract-uma-info.ts`

Extracts uma musume character data and filters outfits by the snapshot-local `skills.json` file.

**Output:** `public/data/{snapshot}/umas.json`

```bash
pnpm run extract:uma-info -- --snapshot global
pnpm run extract:uma-info -- --snapshot jp /path/to/master.mdb
```

### `extract-course-data.ts`

Extracts course/track metadata, corners, straights, and slopes.

**Output:** `public/data/{snapshot}/course_data.json`

```bash
pnpm run extract:course-data -- --snapshot global
pnpm run extract:course-data -- --snapshot jp /path/to/master.mdb
```

### `extract-course-geometry.ts`

Extracts normalized course geometry from Unity YAML assets.

**Defaults:**

- Course data: `public/data/{snapshot}/course_data.json`
- Output: `public/data/{snapshot}/course_geometry.json`

**Overrides:**

- `--course-data <path>` to read a different course catalog
- `--output <path>` to emit geometry somewhere else
- `--source <path>` to point at a different extracted asset tree

```bash
pnpm run extract:course-geometry -- --snapshot global
pnpm run extract:course-geometry -- --snapshot jp
pnpm run extract:course-geometry -- --snapshot jp --course-data /tmp/course_data.json --output /tmp/course_geometry.json
```

### `extract-all.ts`

Runs skills, uma info, and course data extraction in sequence, then rewrites the snapshot manifest.

```bash
pnpm run extract:all -- --snapshot global
pnpm run extract:all -- --snapshot jp /path/to/master.mdb
```

## Snapshot Manifest Version

`manifest.json` includes a `version` field. By default it falls back to `unknown`.
If you know the resource version, set `UMALATOR_SNAPSHOT_VERSION` when running extraction commands:

```bash
UMALATOR_SNAPSHOT_VERSION=10004010 pnpm run extract:all -- --snapshot jp /path/to/master.mdb
```

## Data Format

### JSON Output

- **Minified**: no pretty-printing
- **Sorted**: numeric-keyed records are sorted ascending
- **Trailing newline**: single `\n` at end of file
- **UTF-8**: all text properly encoded

## Shared Libraries

### `scripts/lib/shared.ts`

- `sortByNumericKey()` - sort object keys numerically
- `writeJsonFile()` - write canonical JSON and create parent directories
- `resolveMasterDbPath()` - resolve database path
- `getUniqueSkillForOutfit()` - calculate unique skill ID

### `scripts/lib/snapshot-output.ts`

- `SnapshotId` - runtime snapshot ids (`global` / `jp`)
- `resolveSnapshotOutputDir()` - resolve `public/data/{snapshot}`
- `resolveSnapshotFile()` - resolve snapshot-local JSON paths
- `writeSnapshotManifest()` - write `manifest.json`

### `scripts/lib/database.ts`

- `openDatabase()` - open SQLite database (readonly)
- `closeDatabase()` - close database connection
- `queryAll()` - execute query and return all rows
- `queryAllWithParams()` - execute parameterized query

## Troubleshooting

### "Failed to open database"

- Verify the database path is correct
- Ensure the game is not running (file may be locked)
- Check file permissions

### "Could not read courseeventparams"

- Ensure `courseeventparams/` exists
- Verify course JSON files are present
- Pass a custom path as the second positional argument to `extract-course-data.ts` if needed

### Missing `tracknames.json` for JP

A JP snapshot is incomplete until `public/data/jp/tracknames.json` exists.
This file is not generated today; source it from your JP translation workflow.

## Testing

```bash
pnpm run extract:all -- --snapshot global
pnpm run extract:course-geometry -- --snapshot global
```

Verify the generated files under `public/data/global/` are minified JSON with a trailing newline.

## Legacy Perl Scripts

Legacy Perl scripts remain in `scripts/legacy/` for reference only.

## License

GPL-3.0-only (same as parent project)
