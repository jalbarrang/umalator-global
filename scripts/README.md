# Data Extraction Scripts

TypeScript-based data extraction scripts using Bun's native SQLite support. These scripts replace the legacy Perl scripts for extracting game data from `master.mdb`.

## Prerequisites

- **Bun** (v1.0 or later) - [Install Bun](https://bun.sh)
- **master.mdb** - Game database file from Uma Musume installation

## Quick Start

Extract all data at once:

```bash
bun run extract:all
```

If you have `master.mdb` in a local `db/` directory, the scripts will automatically find it! Otherwise, pass the path as an argument:

```bash
bun run extract:all /path/to/master.mdb
```

Or run individual extraction scripts:

```bash
bun run extract:skill-meta      # Skill metadata
bun run extract:skillnames       # Skill names (EN/JP)
bun run extract:skill-data       # Skill mechanics
bun run extract:uma-info         # Uma musume data
bun run extract:course-data      # Course/track data
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
bun scripts/extract-skill-meta.ts /path/to/master.mdb
```

## Scripts Overview

### extract-skill-meta.ts

Extracts skill metadata (group ID, icon ID, SP cost, display order).

**Output:** `src/modules/data/skill_meta.json`

**Usage:**
```bash
bun run extract:skill-meta
# or
bun scripts/extract-skill-meta.ts [path/to/master.mdb]
```

### extract-skillnames.ts

Extracts skill names in English and Japanese. Automatically generates inherited versions for unique skills.

**Output:** `src/modules/data/skillnames.json`

**Usage:**
```bash
bun run extract:skillnames
# or
bun scripts/extract-skillnames.ts [path/to/master.mdb]
```

### extract-skill-data.ts

Extracts skill mechanics (conditions, effects, durations). Applies scenario skill modifiers and handles special cases like Seirios split alternatives.

**Output:** `src/modules/data/skill_data.json`

**Features:**
- Applies 1.2x modifier to scenario skills
- Handles split alternatives for specific skills (Seirios)
- Processes up to 2 alternatives per skill
- Supports up to 3 effects per alternative

**Usage:**
```bash
bun run extract:skill-data
# or
bun scripts/extract-skill-data.ts [path/to/master.mdb]
```

### extract-uma-info.ts

Extracts uma musume character data (names, outfits). Filters out unimplemented umas by checking if their unique skills exist.

**Output:** `src/modules/data/umas.json`

**Requirements:**
- Reads existing `skill_meta.json` for filtering
- Reads existing `umas.json` as base

**Usage:**
```bash
bun run extract:uma-info
# or
bun scripts/extract-uma-info.ts [path/to/master.mdb]
```

### extract-course-data.ts

Extracts course/track data including geometry (corners, straights, slopes).

**Output:** `src/modules/data/course_data.json`

**Requirements:**
- Requires `courseeventparams/` directory with course geometry JSON files
- Pass courseeventparams path as second argument if not in default location

**Usage:**
```bash
bun run extract:course-data
# or
bun scripts/extract-course-data.ts [path/to/master.mdb] [path/to/courseeventparams]
```

**Special Cases:**
- Skips incomplete Longchamp courses (IDs 11201, 11202)
- Processes corner, straight, and slope events
- Calculates distance type (Short/Mile/Mid/Long)

### extract-all.ts

Master script that runs all extraction scripts in sequence.

**Usage:**
```bash
bun run extract:all
# or
bun scripts/extract-all.ts [path/to/master.mdb]
```

**Features:**
- Runs all extractions sequentially
- Error handling with summary report
- Progress indicators
- Exits with error if any extraction fails

## Output Files

All extracted data is written to `src/modules/data/`:

| File | Description |
|------|-------------|
| `skill_meta.json` | Skill metadata (icons, costs, order) |
| `skillnames.json` | Skill names (English/Japanese) |
| `skill_data.json` | Skill mechanics (conditions, effects) |
| `umas.json` | Uma musume character data |
| `course_data.json` | Course/track geometry data |

## Data Format

### JSON Output

- **Minified**: No pretty-printing (matches Perl output)
- **Sorted**: Keys sorted numerically
- **Trailing newline**: Single `\n` at end of file
- **UTF-8**: All text properly encoded

## Shared Libraries

### scripts/lib/shared.ts

Utility functions:
- `sortByNumericKey()` - Sort object keys numerically
- `writeJsonFile()` - Write JSON with canonical format
- `resolveMasterDbPath()` - Resolve database path
- `getUniqueSkillForOutfit()` - Calculate unique skill ID

### scripts/lib/database.ts

Database helpers:
- `openDatabase()` - Open SQLite database (readonly)
- `closeDatabase()` - Close database connection
- `queryAll()` - Execute query and return all rows
- `queryAllWithParams()` - Execute parameterized query

## Advantages Over Perl

- **3-6x faster** - Bun's native SQLite is highly optimized
- **Type safety** - TypeScript catches errors at compile time
- **No dependencies** - No need to install Perl modules
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

Bun handles UTF-8 automatically. If you see garbled Japanese text:
- Verify the database file is from the current game version
- Check that your terminal supports UTF-8

### Permission errors

On Unix systems, make scripts executable:
```bash
chmod +x scripts/*.ts
```

## Development

### Adding a New Extraction Script

1. Create script in `scripts/` directory
2. Import shared utilities from `scripts/lib/`
3. Export main function for use in `extract-all.ts`
4. Add script to `package.json` scripts section
5. Update this README

### Testing

Compare output with Perl version:
```bash
# Extract with Perl
perl scripts/legacy/make_global_skill_meta.pl master.mdb > perl_output.json

# Extract with Bun
bun scripts/extract-skill-meta.ts master.mdb

# Compare
diff perl_output.json src/modules/data/skill_meta.json
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

