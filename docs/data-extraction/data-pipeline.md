# Data Pipeline

How game data gets into the project — what we extract, where it comes from, and how the pieces fit together.

## Overview

Game data is assembled from two complementary sources:

| Source | What it provides | How we access it |
| --- | --- | --- |
| **master.mdb** | Skills, support cards, characters, courses | Local SQLite queries via `bun:sqlite` |
| **GameTora** | Support card event rewards, event skill hints | Public manifest API (HTTP + JSON) |

Neither source is complete on its own. `master.mdb` has authoritative skill mechanics and card metadata but lacks event reward mappings. GameTora's manifest fills that gap with decoded event data including skill hint rewards.

## Recommended Pipeline Order

```bash
# 1. Extract base data from master.mdb
bun run extract:all

# 2. Fetch event rewards from GameTora and merge into support cards
bun run fetch:support-events
```

Step 1 populates skills, support cards (with `hintSkills`), characters, and courses. Step 2 then populates `eventSkills` and writes the full event data for each support card. Running step 2 after step 1 ensures the skill name map is available for resolving event skill IDs into human-readable names.

## Source: master.mdb

The game's local SQLite database, shipped with the Uma Musume client. Contains the canonical definitions for game mechanics.

### What we extract

| Script | Output | Key tables |
| --- | --- | --- |
| `extract-skills.ts` | `skills.json` | `skill_data`, `single_mode_skill`, `text_data` (category 47) |
| `extract-support-cards.ts` | `support-cards.json` | `support_card_data`, `single_mode_hint_gain`, `text_data` (76, 77) |
| `extract-uma-info.ts` | `umas.json` | `card_data`, `text_data`, cross-ref with `skills.json` |
| `extract-course-data.ts` | `course_data.json` | `race_course_set`, `course_event_params` JSON files |

### Merge vs Replace

All `extract:*` scripts default to **merge mode** — they update entries found in `master.mdb` while preserving entries that only exist in the current JSON files (e.g., future/datamined content). Pass `--replace` for a clean slate.

### What master.mdb does NOT have

Support card event rewards. The database has event story metadata (`single_mode_story_data`) and event titles (`text_data` category 181), but no reliable `story_id → skill_id` reward mapping. See [support-card-skill-sources.md](./support-card-skill-sources.md) for the full investigation.

## Source: GameTora

[GameTora](https://gametora.com/) is a community resource for Uma Musume game data. We use their public manifest API to fetch support card event data that isn't available in `master.mdb`.

### What we fetch

| Script | Output | Manifest keys |
| --- | --- | --- |
| `fetch-support-events.ts` | `support-cards.json` (`eventSkills`), `support-events.json` | See below |

**Manifest keys used:**

| Key | Description |
| --- | --- |
| `training_events/ssr` | SSR support card events, keyed by support card ID |
| `training_events/sr` | SR support card events, keyed by support card ID |
| `training_events/shared` | Character-level events, keyed by character ID — applies to all cards (R, SR, SSR) for that character |
| `training_events/friend` | Friend-type card events, keyed by character ID |
| `training_events/group` | Group-type card events, keyed by support card ID |
| `dict/te_names_en` | XOR-encrypted English event names |
| `dict/te_names_ja` | XOR-encrypted Japanese event names (fallback) |
| `dict/evrew` | Event reward dictionary (stat keys, values, skill IDs) |

### How event mapping works

1. **Fetch the manifest** from `gametora.com/data/manifests/umamusume.json` — an index of content-hashed URLs.
2. **Load training events** for each category (SSR, SR, shared, friend, group).
3. **Decrypt event names** — GameTora XOR-encodes names as `base64(plaintext XOR repeat("k" + key))`.
4. **Decode rewards** from the `evrew` dictionary — entries with key `"sk"` contain skill IDs.
5. **Map to support cards:**
   - SSR/SR/group events are keyed by support card ID → direct match.
   - Shared events are keyed by character ID → applied to every support card with that `charaId`.
   - Friend events are keyed by character ID → applied only to friend-type cards (type 6).
6. **Write results** — `eventSkills` merged into `support-cards.json`, full event data to `support-events.json`.

### Caching

Fetched JSON is cached in `.cache/gametora/` (gitignored). On network failure, the script falls back to cached data automatically.

## Output Files

All extracted data lands in `src/modules/data/json/`:

| File | Source | Description |
| --- | --- | --- |
| `skills.json` | master.mdb | Unified skill data (metadata, names, activation mechanics) |
| `support-cards.json` | master.mdb + GameTora | Support card data with `hintSkills` (master.mdb) and `eventSkills` (GameTora) |
| `support-events.json` | GameTora | Full event data per support card (event names, choices, rewards) |
| `umas.json` | master.mdb | Uma musume character data (names, outfits) |
| `course_data.json` | master.mdb | Course/track geometry (corners, straights, slopes) |

## Acknowledgements

This project relies on data from [GameTora](https://gametora.com/) for support card event rewards and skill hint mappings. GameTora is an essential community resource for the Uma Musume community, and we are grateful for the data they make available. Their work makes it possible for tools like this to provide complete support card information.

Game data originates from **Uma Musume: Pretty Derby** by **Cygames, Inc.** — see the project's copyright notice for full attribution.
