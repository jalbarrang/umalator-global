# PRD: Race Simulation — Phase 3 & 4: Data Collection, Worker & UI

> **Status:** Draft — living document
> **Last updated:** 2026-03-16
> **Depends on:** [Phase 1 (MVP)](race-simulation.md) — Complete, [Phase 2](race-simulation-phase2.md) — Complete

---

## 1. Overview

Phase 3 adds data collection and a Web Worker for the 9-runner race sim. Phase 4 builds the `/race-sim` UI — replacing the `WorkInProgress` placeholder with a functional page that configures runners, triggers simulations, and displays results.

These two phases are tightly coupled: the UI needs the worker/collector to display anything meaningful, and the collector's output shape is driven by what the UI needs to render. They are documented together to design them as one cohesive unit.

---

## 2. Resolved Decisions

### Data Collection

- [x] **Focus runners:** User-selectable. Any runner can be toggled as "focus" via a pin icon on the runner tile.
- [x] **Non-focus runner data:** Finish order + finish time only. May further optimize the non-focus collection path for better simulation performance.
- [x] **Collector class:** New `RaceSimDataCollector` class. Refactor data collection to use an event-like system rather than extending the existing collector.
- [x] **Skill activation data:** The existing `SkillEffectLog` format works as-is.

### Worker

- [x] **Sample execution:** Run all N samples at once (no progressive batching). N ≤ 10 makes batching unnecessary.
- [x] **Cancellation:** Yes — support cancellation mid-run.

### Snapshotting

- [x] **Position snapshotting:** Implement now. Snapshot all runner positions at tick start for parallel-safe proximity queries.

### UI — Layout & Configuration

- [x] **Runner configuration:** New compact `RunnerTile` component — NOT reusing `RunnerCard` (too heavy for 9). Tiles expand on click into an inline editor (drawer) for stats, aptitudes, outfit, skills.
- [x] **9-runner field display:** 3×3 grid of compact runner tiles, strategy color-coded (amber = FrontRunner, blue = PaceChaser, purple = LateSurger, red = EndCloser). Color carries through to results table.
- [x] **Course/race settings:** Reuse the existing `RaceSettingsPanel` (collapsible horizontal bar with Track, Ground, Season, Weather, TimeOfDay, Presets). Already used on home, skill-bassin, uma-bassin, and skill-planner. May need a thin wrapper if the race-sim store is separate from the global `useSettingsStore`.
- [x] **Focus runner in UI:** Yes. User-selectable via pin icon on tile. Also selectable by clicking a row in the results table. Focus runner gets a green border glow.

### UI — Results & Visualization

- [x] **Minimum viable results:** Heatmap-style finish order table — runners as rows, samples as columns, finish position in cells color-coded green (1st) to red (9th). Aggregate columns: Avg / Best / Worst.
- [x] **Velocity/HP charts:** Focus runner(s) only, in an expandable detail panel below the results table. Not for all 9.
- [x] **Race replay animation:** Deferred to Phase 5.
- [x] **Results persistence:** Persist until re-run. Stale results detection — dim results and show "re-run" prompt when any input (runner config, course, conditions) changes since last run.

---

## 3. Phase 3: Data Collection + Worker

### 3.1 RaceSimDataCollector

New file: `src/lib/sunday-tools/race-sim/race-sim-collector.ts`

New class — does NOT extend `VacuumCompareDataCollector`. Data collection should be refactored to use an event-like system so collectors subscribe to the events they care about, rather than the observer pattern where every lifecycle hook must be implemented.

**Existing collector reference:** `VacuumCompareDataCollector` in `common/race-observer.ts` collects per-tick arrays (time, position, velocity, HP, lane, pacerGap) plus skill activations, rushed/dueling/spot-struggle regions for 1-2 runners.

**Tiered collection:**

| Tier          | Data per tick                                                   | Data per round                                               | Use case                               |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------- |
| Full          | time, position, velocity, HP, lane, pacerGap, skill activations | rushed/dueling/spot-struggle regions, startDelay, spurt info | Focus runner(s) — detailed charts      |
| Position-only | position                                                        | finish order, finish time                                    | Non-focus runners — finish order table |

The tier assignment (which runners get full vs position-only) is user-selectable at runtime via focus runner toggles. Any runner can be promoted to full collection.

**Skill activation data:** Uses the existing `SkillEffectLog` format.

### 3.2 Worker

New file: `src/workers/race-sim.worker.ts`

Pattern follows `simulator.worker.ts`:

- Receives `RaceSimParams` + collector config
- Runs `runRaceSim()` (or an enhanced version that accepts a collector)
- Runs all N samples at once (no progressive batching — N ≤ 10 makes it unnecessary)
- Posts progress messages (`race-sim-progress`) and final results (`race-sim-complete`)
- Supports mid-run cancellation

### 3.3 Hook

New file: `src/modules/simulation/hooks/race-sim/useRaceSimRunner.ts`

Pattern follows `useSimulationRunner`:

- Posts params to the worker
- Receives progress/results
- Exposes loading state, results, and error

### 3.4 Snapshotting

At the start of `Race.onUpdate()`, before the runner loop, snapshot all runner positions into a `Map<number, { position, currentLane, currentSpeed }>` on `Race`. Proximity queries read from this snapshot instead of live state.

This eliminates the ~1m positional drift at 15 FPS between first and last runner update within a tick (the known approximation documented in Phase 1).

---

## 4. Phase 4: UI

### 4.1 Route & Page Structure

Replace `WorkInProgress` in `src/routes/race-sim.tsx` with the actual page.

**Design direction:** Command-center / race control dashboard — dense but organized, with a strong visual hierarchy between the "setup" phase and "results" phase. No sidebar — the vacuum compare sidebar pattern doesn't scale for 9 runners. Everything is vertically stacked with progressive disclosure.

**Layout:**

```
┌──────────────────────────────────────────────────────────┐
│  RACE SETTINGS (collapsible horizontal bar)              │
│  Course · Ground · Season · Weather · Time               │
├──────────────────────────────────────────────────────────┤
│  RUNNER FIELD: 3×3 Grid of compact runner tiles          │
│  ┌─────┐ ┌─────┐ ┌─────┐                                │
│  │ FR1 │ │ FR2 │ │ PC1 │  ← strategy color-coded        │
│  └─────┘ └─────┘ └─────┘    (amber/blue/purple/red)     │
│  ┌─────┐ ┌─────┐ ┌─────┐                                │
│  │ PC2 │ │ PC3 │ │ LS1 │  ★ = focus runner toggle       │
│  └─────┘ └─────┘ └─────┘                                │
│  ┌─────┐ ┌─────┐ ┌─────┐                                │
│  │ LS2 │ │ EC1 │ │ EC2 │  click tile → expand editor    │
│  └─────┘ └─────┘ └─────┘                                │
├──────────────────────────────────────────────────────────┤
│  ACTION BAR: [▶ Run] [Randomize] Samples: [5] Seed: [x] │
├──────────────────────────────────────────────────────────┤
│  RESULTS (appears after simulation)                      │
│  ┌──────────────────────────────────────────────────────┐│
│  │ Finish Order Heatmap Table                           ││
│  │ Rows: 9 runners (gate, name, strategy badge)        ││
│  │ Cols: S1..SN + Avg + Best + Worst                   ││
│  │ Cells: position number, green→red heatmap bg        ││
│  └──────────────────────────────────────────────────────┘│
│  ┌──────────────────────────────────────────────────────┐│
│  │ Focus Runner Detail (click row to select)            ││
│  │ Velocity over Distance | HP over Distance charts    ││
│  │ Skill activation timeline                            ││
│  └──────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

**Responsive breakpoints:**

- Desktop (≥1024px): 3×3 runner grid, full heatmap table
- Tablet (768–1023px): 2-column runner grid, horizontal scroll on results table
- Mobile (<768px): Single-column runner list (collapsible), bottom sheet for runner editing, sticky first column in results table, FAB for "Run Simulation"

### 4.2 Store

New Zustand store: `src/modules/simulation/stores/race-sim.store.ts`

State:

- `runners: CreateRunner[]` (9 runners, initialized from `generateMobField()`)
- `courseId: number`
- `raceConditions: RaceConditions`
- `nsamples: number` (1-10)
- `seed: number`
- `results: RaceSimResult | null`
- `isRunning: boolean`
- `focusRunnerIndices: Set<number>` (user-selectable, multiple allowed)
- `isStale: boolean` (true when any input changed since last run)

Actions:

- `updateRunner(index, partial)`
- `randomizeField()`
- `setCourse(courseId)`
- `setConditions(conditions)`
- `toggleFocusRunner(index)`
- `runSimulation()`
- `cancelSimulation()`
- `clearResults()`

Persist runner field, course, and conditions via Zustand (same persistence pattern as other simulation stores).

### 4.3 Components

#### Race Settings Section

| Component                                                                                             | Source                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RaceSettingsPanel` — collapsible horizontal bar (Track, Ground, Season, Weather, TimeOfDay, Presets) | Existing — used on home, skill/uma-bassin, skill-planner. Reads from global `useSettingsStore`. Race sim either shares the global store or gets a thin wrapper to wire into race-sim store. |

#### Runner Field Section

| Component                                                                                                                              | Source                      |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| `RunnerFieldGrid` — responsive 3×3 grid layout (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`)                                           | New                         |
| `RunnerTile` — compact card: gate #, name/outfit icon, strategy badge (color-coded pill), stat summary, focus toggle (star/pin)        | New                         |
| `RunnerTileEditor` — expanded inline editor: stats, aptitudes, strategy, outfit picker, skill picker. Opens as drawer/dialog on click. | New (reuses sub-components) |
| `StrategyBadge` — color-coded pill (amber=FR, blue=PC, purple=LS, red=EC)                                                              | New                         |
| `FocusRunnerToggle` — star/pin icon on tile, marks runner for full data collection                                                     | New                         |
| `StrategySelect` / `StatsTable` (compact) / `AptitudesTable` (compact) / `UmaSelector` / `SkillPicker`                                 | Existing / adapted          |

#### Action Bar

| Component                                                                                                              | Source                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `SimulationControlBar` — run/cancel/replay/clear buttons + seed input with `createNewSeed`/`setSeed`/`parseSeed` logic | Existing — used by uma-bassin and skill-bassin. Adapts to race sim store's `createNewSeed`/`setSeed`. |
| `RandomizeFieldButton` — regenerates field with default runner configs via `generateMobField()`                        | New                                                                                                   |
| `SampleCountInput` (1-10)                                                                                              | New (uses existing `Input`)                                                                           |

#### Results Section

| Component                                                                                        | Source                                |
| ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `FinishOrderTable` — heatmap table: runners × samples, cells color-coded green (1st) → red (9th) | New                                   |
| `PositionCell` — cell with position number + heatmap background                                  | New                                   |
| Aggregate columns: Avg / Best / Worst                                                            | Part of table                         |
| `FocusRunnerDetailPanel` — expandable panel: velocity/HP charts + skill activation timeline      | New                                   |
| `VelocityChart` / `HpChart` — line charts over distance                                          | New (adapt from `RaceTrack` patterns) |
| `SkillActivationTimeline` — horizontal bars showing skill active durations                       | New                                   |

#### UI Primitives (existing)

`Button`, `Select`, `Table`, `Card`, `Tabs`, `Collapsible`, `Input`, `Drawer` from `src/components/ui/`

### 4.4 UI Logic

- **Stale results detection** — Track whether any input has changed since last run. Dim results and show "re-run" prompt.
- **Runner diff highlighting** — Visually highlight stats that differ from the default values (800 flat).
- **Focus runner auto-suggestion** — If only one runner has an outfit assigned, auto-suggest it as focus.
- **Smart seed management** — Auto-increment seed on each run. Show seed used per result set for reproducibility.
- **Debounced edits** — Don't auto-run on config change; wait for explicit "Run" click.
- **Scroll to results** — Auto-scroll to results section after simulation completes.
- **Persistent configuration** — Persist via Zustand store (same pattern as other simulation stores).

---

## 5. Implementation Order

```
Phase 3:
  Step 1: Position snapshotting in Race.onUpdate()
  Step 2: Event-like data collection refactor + RaceSimDataCollector (tiered)
  Step 3: Enhanced runRaceSim to accept collector
  Step 4: race-sim.worker.ts (all-at-once execution + cancellation)
  Step 5: useRaceSimRunner hook

Phase 4:
  Step 6: race-sim.store.ts (Zustand, localStorage persistence)
  Step 7: Wire RaceSettingsPanel (existing) into race-sim page
  Step 8: RunnerFieldGrid + RunnerTile (3×3 grid, strategy color-coding)
  Step 9: RunnerTileEditor — inline editing (stats, aptitudes, outfit, skills)
  Step 10: Action bar — Run + Randomize + Samples/Seed + Cancel
  Step 11: FinishOrderTable — heatmap results table (green→red)
  Step 12: FocusRunnerDetailPanel — velocity/HP charts + skill timeline
  Step 13: Stale results detection + UI polish
```

---

## 6. What Is NOT Changing

- Vacuum compare and all existing tools — untouched
- Existing workers, stores, hooks — untouched
- Phase 1/2 engine changes — stable foundation
- Existing `RaceTrack` visualization — not modified (may be reused read-only for focus runner)

---

## 7. Future Context (Phase 5+)

- Race replay animation (bird's eye view, track visualization) — explicitly deferred from Phase 4
- Default field presets by course type / grade
- Statistical analysis across samples (win rates, position distributions)
- Extended runner configuration (import from saved runners library)
