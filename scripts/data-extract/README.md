# Data Extraction Scripts

TypeScript-based data extraction scripts using Bun and `bun:sqlite`. These scripts replace the legacy Perl scripts for extracting game data from `master.mdb`.

## Prerequisites

- **Node.js** (v24 or later)
- **bun** (project package manager)
- **master.mdb** - Game database file from Uma Musume installation

## Quick Start

**Default behavior (Merge Mode - Recommended)**:

```bash
bun run extract:all
```

This will:

- ✅ Update entries from `master.mdb` (current game content)
- ✅ **Preserve** entries not in master.mdb (future/datamined content from gametora)
- ✅ Automatically find `db/master.mdb` if it exists

**Full replacement mode** (wipes future content):

```bash
bun run extract:all -- --replace
# or
bun run extract:all -- --full
```

Or run individual extraction scripts:

```bash
bun run extract:skills          # Unified skill data (meta + names + mechanics)
bun run extract:support-cards   # Support card data with hint/event skill arrays
bun run extract:uma-info        # Uma musume data
bun run extract:course-data     # Course/track data
```

## Database Location

### Windows

Default path:

```
%APPDATA%\..\LocalLow\Cygames\Umamusume\master\master.mdb
```

Full path typically:

```
C:\Users\[YourUsername]\AppData\LocalLow\Cygames\Umamusume\master\master.mdb
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
│   └── master.mdb    # <- Put it here!
├── scripts/
└── ...
```

The extraction scripts will automatically detect and use it. This path is gitignored to avoid copyright issues.

### Custom Path

All scripts also accept a custom database path as the first argument:

```bash
bun scripts/data-extract/extract-skills.ts /path/to/master.mdb
```

## Merge vs Replace Mode

### Merge Mode (Default) ✅

**What it does:**

- Reads existing JSON files
- Updates entries that exist in `master.mdb` (current game content)
- **Preserves** entries only in existing files (future/datamined content)

**When to use:**

- Regular updates after game patches
- Keeping future content from gametora while updating current content
- Safe default for most workflows

### Replace Mode ⚠️

**What it does:**

- Completely replaces JSON files with only `master.mdb` content
- **Removes** all future/datamined content

**When to use:**

- Fresh start from scratch
- Cleaning up corrupted data
- When you explicitly want only current game content

**How to use:**

```bash
bun run extract:all -- --replace
# or
bun run extract:skills -- --full
```

## Scripts Overview

### extract-skills.ts

Extracts unified skill data (metadata, names, and mechanics). Applies scenario skill modifiers and handles special cases like Seirios split alternatives.

**Output:** `src/modules/data/json/skills.json`

**Default:** Merge mode (preserves future content)

**Features:**

- Merges metadata (group ID, icon ID, SP cost, display order) with activation data
- Includes extracted names from `text_data`
- Applies 1.2x modifier to scenario skills
- Handles split alternatives for specific skills (Seirios)
- Processes up to 2 alternatives per skill
- Supports up to 3 effects per alternative

**Usage:**

```bash
bun run extract:skills                # Merge mode (default)
bun run extract:skills -- --replace   # Full replacement
```

### extract-support-cards.ts

Extracts support card data with denormalized skill references.

**Output:** `src/modules/data/json/support-cards.json`

**Default:** Merge mode (preserves future content and any manually/externally supplied `eventSkills`)

**Features:**

- Extracts card name from `text_data` category 76
- Extracts support character name from `text_data` category 77
- Maps hint skills from `single_mode_hint_gain` where `hint_gain_type = 0`
- Joins hint rows through `support_card_data.skill_set_id = single_mode_hint_gain.hint_id`
- Emits stable `hintSkills` and `eventSkills` arrays on every card

**Event skill limitation:**

The current Global `master.mdb` snapshot has support-card event stories in `single_mode_story_data`, but does not expose a reliable `story_id -> skill reward` relation in the available reward/conclusion tables. The extractor therefore preserves existing `eventSkills` in merge mode and emits an empty array in replace mode, leaving the schema ready for a future external/manual mapping.

**Usage:**

```bash
bun run extract:support-cards                # Merge mode (default)
bun run extract:support-cards -- --replace   # Full replacement
```

### extract-uma-info.ts

Extracts uma musume character data (names, outfits). Filters out unimplemented umas by checking if their unique skills exist.

**Output:** `src/modules/data/json/umas.json`

**Default:** Merge mode (preserves future content)

**Requirements:**

- Reads existing `skills.json` for filtering

**Usage:**

```bash
bun run extract:uma-info                # Merge mode (default)
bun run extract:uma-info -- --replace   # Full replacement
```

### extract-course-data.ts

Extracts course/track data including geometry (corners, straights, slopes).

**Output:** `src/modules/data/json/course_data.json`

**Default:** Merge mode (preserves future content)

**Requirements:**

- Requires `courseeventparams/` directory with course geometry JSON files
- Pass courseeventparams path as second argument if not in default location

**Usage:**

```bash
bun run extract:course-data                # Merge mode (default)
bun run extract:course-data -- --replace   # Full replacement
```

**Special Cases:**

- Skips incomplete Longchamp courses (IDs 11201, 11202)
- Processes corner, straight, and slope events
- Calculates distance type (Short/Mile/Mid/Long)

### extract-all.ts

Master script that runs all extraction scripts in sequence.

**Default:** Merge mode (preserves future content)

**Usage:**

```bash
bun run extract:all                # Merge mode (default)
bun run extract:all -- --replace   # Full replacement
```

**Features:**

- Runs all extractions sequentially
- Merge mode preserves future/datamined content by default
- Error handling with summary report
- Progress indicators
- Exits with error if any extraction fails

## Output Files

All extracted data is written to `src/modules/data/json`:

| File               | Description                                   |
| ------------------ | --------------------------------------------- |
| `skills.json`      | Unified skill data (meta + names + mechanics) |
| `umas.json`        | Uma musume character data                     |
| `course_data.json` | Course/track geometry data                    |

## Data Format

### JSON Output

- **Minified**: No pretty-printing (matches Perl output)
- **Sorted**: Keys sorted numerically
- **Trailing newline**: Single `\n` at end of file
- **UTF-8**: All text properly encoded

## Shared Libraries

### scripts/master-data/shared.ts

Utility functions:

- `sortByNumericKey()` - Sort object keys numerically
- `writeJsonFile()` - Write JSON with canonical format
- `resolveMasterDbPath()` - Resolve database path
- `getUniqueSkillForOutfit()` - Calculate unique skill ID

### scripts/master-data/database.ts

Database helpers:

- `openDatabase()` - Open SQLite database (readonly)
- `closeDatabase()` - Close database connection
- `queryAll()` - Execute query and return all rows
- `queryAllWithParams()` - Execute parameterized query

## Advantages Over Perl

- **Faster extraction** - `bun:sqlite` is built into Bun and highly optimized
- **Type safety** - TypeScript catches errors at compile time
- **No Perl dependencies** - No need to install CPAN/Perl modules
- **Modern tooling** - Better IDE support and debugging
- **Consistent ecosystem** - Same runtime as the rest of the project

## Troubleshooting

### "Failed to open database"

- Verify the database path is correct
- Ensure the game is not running (file may be locked)
- Check file permissions

### "Could not read courseeventparams"

- Ensure `courseeventparams/` directory exists
- Verify course JSON files are present
- Pass correct path as second argument to `extract-course-data.ts`

### UTF-8 encoding issues

Node + SQLite tooling handles UTF-8 automatically. If you see garbled Japanese text:

- Verify the database file is from the current game version
- Check that your terminal supports UTF-8

### Permission errors

On Unix systems, make scripts executable:

```bash
chmod +x scripts/data-extract/*.ts scripts/master-data/*.ts
```

## Development

### Adding a New Extraction Script

1. Create script in `scripts/data-extract/` directory
2. Import shared utilities from `scripts/master-data/`
3. Export main function for use in `extract-all.ts`
4. Add script to `package.json` scripts section
5. Update this README

### Testing

Compare output with Perl version:

```bash
# Extract with Perl
perl scripts/legacy/make_global_skill_meta.pl master.mdb > perl_meta.json
perl scripts/legacy/make_global_skillnames.pl master.mdb > perl_names.json
perl scripts/legacy/make_global_skill_data.pl master.mdb > perl_data.json

# Extract with Bun
bun scripts/data-extract/extract-skills.ts master.mdb

# Compare key count as a quick sanity check
node -e "const fs=require('fs');const skills=JSON.parse(fs.readFileSync('src/modules/data/skills.json','utf8'));console.log(Object.keys(skills).length)"
```

## Legacy Perl Scripts

Legacy Perl scripts are preserved in `scripts/legacy/` for reference. They are no longer maintained but kept for comparison and verification purposes.

## Contributing

When updating extraction logic:

1. Update the corresponding TypeScript script
2. Test against known good data
3. Verify JSON output format matches expected schema
4. Update this README if adding new features

## License

GPL-3.0-only (same as parent project)
