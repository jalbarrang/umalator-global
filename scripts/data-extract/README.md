# Data Extraction Scripts

Scripts for extracting and assembling game data from multiple sources into the JSON files consumed by the application.

For the full picture of what data comes from where (master.mdb vs GameTora), see **[docs/data-extraction/data-pipeline.md](../../docs/data-extraction/data-pipeline.md)**.

## Prerequisites

- **bun** (project package manager)
- **master.mdb** — game database file (for `extract:*` scripts)
- **Network access** — for `fetch:support-events` (GameTora manifest API)

## Quick Start

```bash
# 1. Extract base data from master.mdb
bun run extract:all

# 2. Fetch event rewards from GameTora and merge into support cards
bun run fetch:support-events
```

Step 1 extracts skills, support cards, characters, and courses from `master.mdb`. Step 2 fetches support card event data (including skill hints from events) from GameTora's manifest API and merges it into `support-cards.json`.

## Database Location

Place `master.mdb` in a `db/` directory at the project root (gitignored):

```
umalator-global/
├── db/
│   └── master.mdb
├── scripts/
└── ...
```

All scripts auto-detect this path. You can also pass a custom path:

```bash
bun scripts/data-extract/extract-skills.ts /path/to/master.mdb
```

Platform defaults:

- **Windows:** `%APPDATA%\..\LocalLow\Cygames\Umamusume\master\master.mdb`
- **macOS/Linux (Steam):** `~/.local/share/Steam/steamapps/compatdata/[AppID]/pfx/.../master.mdb`

## Scripts

### master.mdb Extraction

These scripts read the local SQLite database. All default to **merge mode** (preserves entries not in `master.mdb`). Pass `--replace` for a clean slate.

| Script | Command | Output |
| --- | --- | --- |
| `extract-skills.ts` | `bun run extract:skills` | `skills.json` |
| `extract-support-cards.ts` | `bun run extract:support-cards` | `support-cards.json` |
| `extract-uma-info.ts` | `bun run extract:uma-info` | `umas.json` |
| `extract-course-data.ts` | `bun run extract:course-data` | `course_data.json` |
| `extract-all.ts` | `bun run extract:all` | All of the above |

### GameTora Fetch

| Script | Command | Output |
| --- | --- | --- |
| `fetch-support-events.ts` | `bun run fetch:support-events` | `support-cards.json` (eventSkills), `support-events.json` |

Fetches support card event data from GameTora's public manifest API. Populates `eventSkills` on each support card — the skill hints granted by card events that `master.mdb` does not expose.

Fetches five event categories and maps them to support cards:

| Category | Keyed by | Applies to |
| --- | --- | --- |
| `training_events/ssr` | support card ID | SSR cards |
| `training_events/sr` | support card ID | SR cards |
| `training_events/shared` | character ID | All cards for that character |
| `training_events/friend` | character ID | Friend-type cards |
| `training_events/group` | support card ID | Group-type cards |

Use `--dry-run` to preview without writing files.

**Requires:** `support-cards.json` and `skills.json` to already exist (run `extract:all` first).

## Output Files

All output goes to `src/modules/data/json/`:

| File | Source(s) | Description |
| --- | --- | --- |
| `skills.json` | master.mdb | Skill metadata, names, and activation mechanics |
| `support-cards.json` | master.mdb + GameTora | Card data with `hintSkills` and `eventSkills` |
| `support-events.json` | GameTora | Full event data (names, choices, rewards) |
| `umas.json` | master.mdb | Character data (names, outfits) |
| `course_data.json` | master.mdb | Course geometry (corners, straights, slopes) |

## Merge vs Replace

| Mode | Behavior | Use when |
| --- | --- | --- |
| **Merge** (default) | Updates master.mdb entries, preserves others | Regular updates, keeping future/datamined content |
| **Replace** (`--replace`) | Overwrites with only master.mdb content | Fresh start, cleaning corrupted data |

```bash
bun run extract:all                # Merge (default)
bun run extract:all -- --replace   # Replace
```

## Shared Libraries

- **`scripts/master-data/shared.ts`** — JSON I/O, key sorting, DB path resolution
- **`scripts/master-data/database.ts`** — SQLite helpers (`openDatabase`, `queryAll`, etc.)

## Troubleshooting

- **"Failed to open database"** — check path, ensure game is not running (file lock), verify permissions.
- **"Could not read courseeventparams"** — ensure `courseeventparams/` directory exists with course JSON files.
- **`fetch:support-events` network errors** — the script falls back to `.cache/gametora/` automatically. Re-run when connectivity is restored to refresh the cache.

## Acknowledgements

Support card event data is sourced from [GameTora](https://gametora.com/), an invaluable community resource for Uma Musume game data. We are grateful for the data they make available, which allows us to provide complete support card event and skill hint information that is not available in `master.mdb` alone.
