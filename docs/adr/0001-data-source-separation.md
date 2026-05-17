# ADR-0001: Data Source Separation — master.mdb for Simulation, GameTora for Entity Catalog

## Status

Accepted

## Context

The project needs data from two sources: the game's local SQLite database (`master.mdb`) and GameTora's public manifest API. Both contain overlapping data (skills, support cards, umas), but each has unique strengths:

- `master.mdb` has course geometry, internal race tables, and detailed mechanics data that GameTora doesn't expose.
- GameTora has the complete entity catalog (including upcoming/JP-only content), multilingual data, server-specific condition overrides (`loc.en`), event reward mappings, and `release_en` provenance flags.

Keeping both sources for the same entities creates reconciliation complexity — especially since 101 skills have different conditions between JP and Global, and upcoming content can introduce condition tokens the simulator doesn't support.

## Decision

Separate concerns entirely by source:

- **master.mdb** owns simulation internals: course geometry, race course sets, track definitions.
- **GameTora** owns the entity catalog: skills, uma outfits, support cards, training events, with their metadata, conditions, effects, and provenance.

The GameTora snapshot uses the same structure as upstream: JP data at the top level, server-specific overrides in a `loc` object (e.g., `loc.en` for Global-correct conditions), and `release_en` fields for provenance.

A local `data-manifest.json` tracks which version (content hash) of each GameTora manifest key was last synced, plus the master.mdb resource version for course data. A single `sync:data` command compares hashes and re-fetches only changed keys.

## Consequences

- **No reconciliation**: each data point has exactly one authoritative source.
- **Provenance is free**: `release_en` from GameTora distinguishes released vs upcoming without extra tagging.
- **Server-correct data**: the simulator uses `loc.en` conditions for Global, not raw JP conditions.
- **Upcoming content is safe**: display features show everything; the simulatability layer gates what enters the simulator.
- **master.mdb extraction shrinks**: `extract:skills`, `extract:support-cards`, and `extract:uma-info` are replaced by GameTora snapshot fetch. Only `extract:course-data` remains on master.mdb.
- **New dependency**: entity catalog correctness depends on GameTora's data quality and availability. Cache fallback mitigates network issues.
