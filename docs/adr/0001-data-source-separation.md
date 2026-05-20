# ADR-0001: Data Source Separation — master.mdb for Simulation & Global Cutover, GameTora for Entity Catalog

## Status

Accepted

## Context

The project needs data from two sources: the game's local SQLite database (`master.mdb`) and GameTora's public manifest API. Both contain overlapping data (skills, support cards, umas), but each has unique strengths:

- `master.mdb` has course geometry, internal race tables, and detailed mechanics data that GameTora doesn't expose. It also reflects **what is live in the Global client today**.
- GameTora has the complete entity catalog (including upcoming/JP-only content), multilingual data, server-specific condition overrides (`loc.en`), event reward mappings, and `release_en` provenance dates.

Keeping both sources for the same entities creates reconciliation complexity — especially since 101 skills have different conditions between JP and Global, and upcoming content can introduce condition tokens the simulator doesn't support.

## Decision

Separate concerns by role, not by a single vendor per entity:

- **master.mdb** owns:
  - Simulation internals: course geometry, race course sets, track definitions.
  - **Global live cutover**: extracted JSON keys/IDs define what ships in the Global client (`skills.json`, `umas.json`, `support-cards.json`). Runtime `isReleased` checks use these extracts.
- **GameTora** owns the **full catalog overlay**: skills, uma outfits, support cards, training events — metadata, conditions, effects, and upcoming content for display when `showUpcoming` is enabled.

The GameTora snapshot uses the same structure as upstream: JP data at the top level, server-specific overrides in a `loc` object (e.g., `loc.en` for Global-correct conditions), and `release_en` fields for release **dates** (provenance/scheduling — not the Global cutover boundary).

At runtime, loaders merge master cutover artifacts with GameTora snapshots (see `skill-loader.ts`, `uma-loader.ts`, `support-card-loader.ts`).

A local `data-manifest.json` tracks which version (content hash) of each GameTora manifest key was last synced, plus the master.mdb resource version for course data. A single `sync:data` command compares hashes and re-fetches only changed keys.

## Consequences

- **Global vs upcoming is explicit**: upcoming = present in GameTora but absent from the master extract; released on Global = present in the master extract.
- **Server-correct data**: the simulator uses `loc.en` conditions for Global, not raw JP conditions.
- **Upcoming content is safe**: display features show the full GameTora catalog; the simulatability layer and master cutover gate what enters the simulator.
- **Dual JSON at runtime for skills is intentional**: `skills.json` (master) + `gametora/skills.json` (catalog).
- **`release_en` is not `isReleased`**: scheduling metadata only; do not use it as the sole live-on-Global signal for skills.
- **New dependency**: catalog freshness depends on GameTora; Global cutover freshness depends on `db:fetch` + entity extracts. Cache fallback mitigates GameTora network issues.
