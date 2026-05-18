# Data Pipeline

How game data gets into the project, and which source owns which data.

See also:

- [ADR-0001: Data Source Separation](../adr/0001-data-source-separation.md)
- [scripts/data-extract/README.md](../../scripts/data-extract/README.md)

## Overview

The project now uses a split-source pipeline with clear ownership:

| Source | Owns | Access path |
| --- | --- | --- |
| **GameTora snapshots** | entity catalog data: skills, character cards, support cards, support effects, training events, reward/name dictionaries | `bun run sync:data` |
| **master.mdb** | simulation internals: course geometry | `bun run extract:all` or `bun run extract:course-data` |

GameTora is the authoritative source for entity catalog data. `master.mdb` is now only used for course geometry needed by the simulator.

## Pipeline Commands

The two sources are independent — run either or both as needed, in any order:

```bash
bun run sync:data       # Entity catalog from GameTora
bun run db:fetch        # Download latest master.mdb
bun run extract:all     # Extract course geometry from master.mdb
```

If you know the `master.mdb` resource version, or want to resolve it from `uma.moe`, pass one of these when extracting courses:

```bash
bun run extract:all -- --resource-version 10004010
bun run extract:all -- --resolve-resource-version
```

## Source: GameTora Snapshots

GameTora is the primary source for the entity catalog.

### What `sync:data` writes

`bun run sync:data` snapshots these manifest keys into `src/modules/data/json/gametora/`:

| Manifest key | Output file |
| --- | --- |
| `skills` | `skills.json` |
| `character-cards` | `character-cards.json` |
| `support-cards` | `support-cards.json` |
| `support_effects` | `support-effects.json` |
| `training_events/ssr` | `training-events-ssr.json` |
| `training_events/sr` | `training-events-sr.json` |
| `training_events/shared` | `training-events-shared.json` |
| `training_events/friend` | `training-events-friend.json` |
| `training_events/group` | `training-events-group.json` |
| `dict/evrew` | `evrew.json` |
| `dict/te_names_en` | `te-names-en.json` |
| `dict/te_names_ja` | `te-names-ja.json` |

### Why GameTora owns the catalog

GameTora gives us:

- released and upcoming content in one catalog
- server-specific overrides such as `loc.en`
- support card event data and reward dictionaries
- provenance fields such as `release_en`

This avoids the old reconciliation problem where entity data was split between `master.mdb` and external event lookups.

## Source: master.mdb

`master.mdb` is now only used for course geometry.

### What we extract

| Script | Output | Inputs |
| --- | --- | --- |
| `extract-course-data.ts` | `src/modules/data/json/course_data.json` | `race_course_set`, `race_course_set_status`, `courseeventparams/*.json` |
| `extract-all.ts` | `src/modules/data/json/course_data.json` | same as above; currently a wrapper around course extraction |

### Manifest tracking

After a successful course extraction, `data-manifest.json` is updated:

- `masterDb.extractedAt` — set to the extraction timestamp
- `masterDb.resourceVersion` — updated when provided explicitly or resolved from `uma.moe`

### Merge vs Replace

Course extraction still defaults to **merge mode** and preserves entries not present in the current `master.mdb`. Pass `--replace` for a clean rebuild.

## Standalone Fallback Tools

These scripts still exist and still work against `master.mdb`, but they are no longer part of the primary pipeline:

| Script | Purpose |
| --- | --- |
| `extract-skills.ts` | Direct `master.mdb` skill extraction |
| `extract-support-cards.ts` | Direct `master.mdb` support card extraction |
| `extract-uma-info.ts` | Direct `master.mdb` uma extraction |

They are useful as fallback/debugging tools when comparing GameTora snapshots against raw `master.mdb` data.

## `fetch-support-events` Status

`fetch-support-events.ts` is now redundant for the main pipeline.

Support card events now come from GameTora snapshots fetched by `sync:data`, so `fetch-support-events` is no longer required for standard data refreshes. It remains in the repo for now as a standalone helper.

## Output Files

### Primary Pipeline Outputs

| File | Source | Produced by |
| --- | --- | --- |
| `src/modules/data/json/gametora/*.json` | GameTora | `bun run sync:data` |
| `src/modules/data/json/course_data.json` | master.mdb | `bun run extract:all` / `bun run extract:course-data` |
| `data-manifest.json` | manifest tracking | `bun run sync:data`, then updated by course extraction |

### Standalone / Legacy Outputs

| File | Source | Produced by |
| --- | --- | --- |
| `src/modules/data/json/skills.json` | master.mdb | `bun run extract:skills` |
| `src/modules/data/json/support-cards.json` | master.mdb | `bun run extract:support-cards` |
| `src/modules/data/json/umas.json` | master.mdb | `bun run extract:uma-info` |
| `src/modules/data/json/support-events.json` | GameTora | `bun run fetch:support-events` |

## Consequence of the Split

The pipeline is now intentionally simple:

- **GameTora owns the catalog**
- **master.mdb owns course geometry**
- **`extract:all` means the primary remaining `master.mdb` extraction path, not “extract every entity”**

That separation matches [ADR-0001](../adr/0001-data-source-separation.md).
