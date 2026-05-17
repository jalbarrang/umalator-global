# Migration Guide: `uma-skill-tools` to `sunday-tools`

This document captures the practical migration strategy from the legacy simulation engine (`uma-skill-tools`) to the new engine (`sunday-tools`), including what changed, what to watch for, and what is still pending.

## Why this migration exists

The legacy engine was effective but tightly coupled in a few places (builder lifecycle, callback-heavy instrumentation, mixed UI/domain types). `sunday-tools` is intended to:

- separate race orchestration (`Race`) from runner behavior (`Runner`)
- make runner lifecycle reusable and explicit (`onPrepare` reset model)
- centralize parser/conditions and shared simulation primitives
- reduce fragile coupling between UI modules and simulation internals

## Current status (high level)

- `sunday-tools` already powers major core pieces and comparison scripts.
- `src/modules/simulation/simulators/skill-compare.ts` has been migrated to the new engine.
- parts of app code still reference old `@/modules/simulation/lib/*` paths and should be migrated incrementally.

## Path and concept mapping

## Old -> New modules

- `@/modules/simulation/lib/core/RaceSolver` -> `@/lib/sunday-tools/common/runner` + `@/lib/sunday-tools/common/race`
- `@/modules/simulation/lib/core/RaceSolverBuilder` -> explicit race setup helpers around `Race`
- `@/modules/simulation/lib/runner/definitions` -> `@/lib/sunday-tools/runner/definitions`
- `@/modules/simulation/lib/skills/definitions` -> `@/lib/sunday-tools/skills/definitions`
- `@/modules/simulation/lib/course/*` -> `@/lib/sunday-tools/course/*`

## Lifecycle mapping

- old: configure `RaceSolverBuilder`, `build()`, then iterate solvers
- new: instantiate `Race`, call `onInitialize()`, `addRunner()`, `prepareRace()`, then per sample call `prepareRound(seed)` and run updates (`run()` or frame stepping)

## Data/type mapping notes

- race condition naming differences:
  - old UI payloads may use `groundCondition` and `time`
  - new engine expects `ground` and `timeOfDay`
- runner stat naming:
  - old UI runner uses `wisdom`
  - new runner stats expect `wit`
- strategy/aptitude parsing:
  - use `parseStrategyName()` and `parseAptitudeName()` from `@/lib/sunday-tools/runner/runner.types`

## Migration pattern (recommended)

For each feature/module:

1. Add a local adapter that maps UI/store types to `CreateRunner` + `RaceParameters`.
2. Keep output shape stable for callers (workers/stores/charts) during migration.
3. Replace old imports with `sunday-tools` imports.
4. Preserve deterministic behavior:
   - use identical sample seed progression (`seed + i`)
   - keep common skill ordering stable (sort by group, then by base ID)
5. Add parity checks for min/median/mean/max and activation behavior.

## What changed in `skill-compare` migration

- moved execution from `RaceSolverBuilder` to direct `Race`/`Runner` simulation loop
- retained external response format:
  - `results`
  - `min/max/mean/median`
  - `runData` (`minrun/maxrun/meanrun/medianrun`)
  - `skillActivations`
- replaced old callback-based instrumentation with best-effort tracking using:
  - `runner.usedSkills`
  - active effect buckets on runner (`targetSpeedSkillsActive`, etc.)

## Known differences/gaps to account for

- old callback hooks (`onSkillActivated`, `onEffectActivated`, `onEffectExpired`) are not yet mirrored in the new engine surface.
- forced skill position behavior from old builder APIs is not fully exposed in `sunday-tools` runner setup.
- some legacy modules still import old engine definitions; migration is not yet complete.
- race-level statistics API (`Race.collectStats()`) is still a stub and should be implemented for better observability.

## Suggested migration phases

## Phase 1: compatibility adapters (short term)

- centralize conversion helpers in one adapter module
- keep UI/worker contracts unchanged
- migrate hot paths first (skill compare, planner compare)

## Phase 2: parity and instrumentation (mid term)

- add Sunday-native event hooks or trace collector
- close condition/parser TODO/FIXME gaps
- complete race stats snapshot API

## Phase 3: cleanup and deprecation (end state)

- remove remaining `@/modules/simulation/lib/*` engine dependencies
- delete or archive old engine files once unused
- simplify stores/components to use Sunday-native shared types only

## Verification checklist for each migrated module

- deterministic seeded runs are stable
- output schema remains unchanged for current consumers
- percentiles/mean/median sanity checks pass
- worker and pool flows still merge results correctly
- chart data still renders without missing fields

## Notes for future contributors

- prefer migration by adapter and feature slice, not a large one-shot rewrite
- avoid changing UI response schemas and engine internals in the same PR
- treat seeded parity tests as required, not optional
