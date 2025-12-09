# Skill Data Sync CLI

Interactive command-line tool for syncing skill data from GameTora source to the simulator data files.

## Features

- **👤 Sync Character Skills by OutfitID**:
  - Simple, focused interface
  - Sync skills from characters up to a specific release
  - Perfect for incremental updates when new characters release

- **Dry Run Mode** 🔍
  - Preview what will be synced before making changes
  - See exact skill IDs that would be affected
  - Toggle on/off in the confirmation screen
  - Proceed with actual sync after reviewing

- **User-Friendly Interface**:
  - Interactive menus with arrow key navigation
  - Progress indicators
  - Detailed results with stats
  - Keyboard shortcuts for quick navigation

## Usage

```bash
npm run sync-skills
```

## Keyboard Shortcuts

### Main Interface

- **Enter** - Confirm / Start sync
- **B** - Go back to input (from confirmation)
- **ESC** - Exit the CLI

### Options

- **D** - Toggle dry run mode (on confirmation screen)
- **P** - Proceed with actual sync (after dry run preview)

## Usage Example

### Sync Skills from a Specific Outfit

1. Run `npm run sync-skills`
2. Enter outfit ID (e.g., "106801" for Kitasan Black)
3. Press **D** to enable dry run (recommended first time!)
4. Press **Enter** to preview
5. Review the skill IDs that would be synced
6. Press **P** to proceed with actual sync, or **ESC** to cancel

**How it works**: Syncs ONLY skills that belong to that specific outfit/character.

**Outfit ID Examples**:

- `100101` - Special Week [Special Dreamer]
- `100302` - Tokai Teio [Beyond the Horizon]
- `106801` - Kitasan Black
- (See `src/modules/data/umas.json` for full list)

**What gets synced**:

- ✅ Skills where the `char` field includes your outfit ID
- ✅ Inherited versions of those specific skills
- ✅ All skill versions (e.g., if character has "Rainy Days ◎", also syncs "Rainy Days ○")
- ❌ Skills from ANY other outfit (even from the same character)
- ❌ Rarity 6 skills (not in game yet)

## Output Files

The CLI syncs data to these files:

- `src/modules/data/skill_data.json` - Skill mechanics (conditions, effects, durations)
- `src/modules/data/skill_meta.json` - Metadata (groupId, iconId, cost, order)
- `src/modules/data/skillnames.json` - English names

## Dry Run Output

When dry run is enabled, you'll see:

```
🔍 Dry Run Preview

Would sync main skills: 42
Would sync gene skills: 42
Total: 84

Skill IDs:
110031, 110041, 110051, ..., 910031, 910041, 910051

⚠ No files were written (dry run mode)

Press P to proceed with actual sync • Press ESC to exit
```

## Technical Details

- **Source**: `src/modules/data/gametora/skills.json`
- **Character Data**: `src/modules/data/umas.json`
- **Engine**: Built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs)
- **Runner**: tsx (TypeScript execution)
- **English Localization**: Automatically uses EN-specific conditions from `loc.en` when available
- **Gene Versions**: Automatically syncs inherited skill versions
- **Character Filtering**: Uses the `char` field in skill data to match character/outfit IDs
- **Skill Versions**: Automatically includes all versions (○, ◎, ×) via the `versions` field
- **Rarity Filter**: Excludes rarity 6 skills (unreleased content)
