# ADR-0004: WASM-vs-TS Statistical-Parity Sign-off (Migration Go/No-Go)

## Status

Superseded by [ADR-0006](0006-retire-ts-simulation-oracle.md).

## Context

The simulation migration replaces the TypeScript `sunday-tools` engine with the
Rust core compiled to WASM (`packages/uma-sim-core` → `packages/uma-sim-wasm`).
(At sign-off the Rust core was the single crate `uma-sim-core`; it was later
split into `uma-sim-primitives` + `uma-sim-race` + `uma-sim-vacuum` — see
[ADR-0005](0005-split-sim-engines.md) — and `uma-sim-core` was deleted. The
parity results below predate that split and were re-validated bit-identical
afterwards, per ADR-0005.)
The two engines use **intentionally different PRNGs** (Rust `xoshiro256**` vs TS
`Prando`), so **exact numeric parity is impossible by construction**. ADR/Fork B
(plan `migrate-sims-to-rust-engine`, task t-002) therefore set the acceptance bar
as **statistical parity** — distributions/means within an agreed tolerance — not
value equality.

This ADR records the pinned tolerance, the measured results, and the go/no-go
decision for decommissioning the TS engine (task t-009).

## Methodology

Harness: `src/lib/uma-sim-wasm/parity.test.ts` (skipped unless
`UMA_WASM_NODE_PKG` points at a node-target WASM build — the web-target loader
cannot init under node). Identical inputs (same course, race parameters, seed,
runner stats) are fed to both engines; outputs are compared as distributions.

Two metrics, covering both the compare/planner read-model path and the
multi-runner Race Sim path (all sims share the one physics core):

1. **Planner / compare bashin-delta** — `runPlannerComparison` (TS) vs two
   `runCompare` vacuums reduced by `computePlannerStats` (WASM), N = 2000 rounds,
   seed 0. Two runners differing by stats (speed/stamina 1000 vs 1200).
2. **Race Sim finish-rank** — `runRaceSim` (TS) vs `runRaceSim` (WASM), 9
   differentiated runners, RN = 500 rounds, seed 0. Mean finish **rank** per gate
   (unit-free; finish *time* is on different internal scales across engines and
   is not a valid cross-engine metric).

Settings parity was verified at the source: Rust `SimulationSettings::default()`
matches TS `NORMAL_SIM_SETTINGS` exactly (Normal mode; health/section/rushed/
downhill/spot-struggle/dueling/wit-checks all on; position-keep mode 2), and
neither path injects artificial dueling.

## Pinned acceptance bar (Fork B)

| Metric | Tolerance |
|---|---|
| Bashin-delta mean | within 2% (relative) |
| Bashin-delta median | within 2% (relative) |
| Bashin-delta std-dev | within 10% (relative) |
| Race finish rank (per gate) | within 1.0 place (absolute) |

## Measured results (seed 0)

**Planner / compare bashin-delta (N = 2000):**

| | mean | median | std | min | max |
|---|---|---|---|---|---|
| TS | 15.962 | 15.523 | 1.815 | 9.83 | 22.60 |
| WASM | 16.084 | 15.561 | 1.875 | 8.64 | 22.82 |
| Δ | 0.76% | 0.24% | 3.3% | — | — |

**Race Sim mean finish rank per gate (RN = 500), gates 0–8:**

```
TS    7.76 6.32 4.05 3.64 6.20 4.04 1.21 0.90 1.89
WASM  7.56 6.65 4.55 3.99 5.33 3.93 1.39 0.97 1.63
|Δ|   0.20 0.33 0.50 0.35 0.87 0.11 0.18 0.07 0.26   (max 0.87)
```

Win-rate shapes match qualitatively in both engines (gates 6/7/8 dominate; gates
0/1 never win).

## Decision

**GO.** Both metrics pass the pinned bar across all sim paths. Parity is strong on
the compare/planner path (sub-1% on mean/median) and acceptable on Race Sim
finish rank (sub-1 place per gate, near-identical at the extremes).

## Amendment (Option B) — t-008 blind spot and the per-skill parity gate

**The original t-008 sign-off above was incomplete.** Both metrics aggregate over
*whole-field* outcomes: a **stat-difference** bashin-delta distribution (two
runners differing only by raw stats, **no skills**) and **finish-rank**
distributions (skill-less runners). Neither metric ever fed a real **skill** into
the engine, so the sign-off **never validated per-skill activation or
effect-application parity**. Three correctness bugs slipped through and only
surfaced during later UI testing:

1. **Compare collector dropped skill-activation logs.** `serde_wasm_bindgen`
   serialized the read-model's `HashMap` activation maps as ES `Map`s, so the TS
   side (typed `Record`) read `skillActivations` as empty `{}` even when a skill
   activated and shifted the result. Fixed by `serialize_maps_as_objects(true)`.
2. **Empty-string preconditions never activated.** Skills whose data carries
   `precondition: ""` (e.g. `all_corner_random`, `straight_random`, `rotation`
   greens) failed to parse the empty precondition and produced no triggers, so
   they never fired (`200332`/`200012`/`200362` → WASM 0.000 vs non-zero TS).
   Fixed by treating an empty precondition as "none" (matches TS `if
   (precondition)`).
3. **Green stat skills accumulated across rounds.** Green skills permanently
   mutate base/adjusted stats, but stats were not reset per round, so a batch run
   stacked the bonus every round (speed 1140→1180→1220…), exploding late-round
   velocity (`200012` read ~11.9 bashin vs TS ~0.15). Fixed by storing pristine
   stats and restoring them each `on_prepare` (mirrors TS `_baseStats`/
   `_adjustedStats`).

### Corrected / expanded parity bar

A **per-skill activation/effect parity gate** is now part of
`parity.test.ts` (`skill-activation/effect parity` describe block). For a
representative skill from each family it asserts BOTH:

| Check | Bar |
|---|---|
| Per-skill bashin-delta mean (TS vs WASM, base runner vs base+skill, N = 2000) | within an absolute per-case tolerance (0.10–0.15 bashin) |
| `skillActivations` capture for an activating skill | **non-empty** (Bug #1 regression) |

Representative skills (compare/planner path, seed 0): `110101` (unique
near-finish current/target speed), `200332` (`all_corner_random` random-corner
target speed), `200012` (`rotation` conditional-passive green SpeedUp), `200362`
(`straight_random` plain-duration target speed). All four pass after the Option B
fixes.

Engine-internal invariants are additionally gated by Rust tests: the compare
collector captures activating duration skills (incl. a 110101-shaped near-finish
unique), empty-precondition skills still activate, green stat skills do not
accumulate across rounds, and seed-offset round chunks are bit-identical to a
single full batch (round independence, relied on by the progressive compare
worker). These originally lived in `packages/uma-sim-core/tests/integration.rs`;
when the engine split (ADR-0005) they were relocated into the inline
`#[cfg(test)]` modules of the split crates (`uma-sim-primitives`,
`uma-sim-race`, `uma-sim-vacuum`).

**Lesson:** whole-field distribution parity is necessary but **not sufficient**;
any future engine swap must also gate **per-skill activation + effect-log**
parity, not just aggregate stat/rank distributions.

## Notes / findings

- One **small systematic** mid-pack difference persists across sample sizes: a
  mid-pack Front Runner (gate 4) ranks ~0.87 place better under WASM than TS. It
  is bounded well under one position and within the agreed tolerance, but is a
  genuine engine difference (not pure sampling noise) and is a candidate for
  future investigation if mid-pack ordering ever needs to be tightened. Tracked
  as known-issue `uma-sim-e97` (non-blocking).
- No existing test asserted specific TS-engine magic numbers; the simulator test
  suites assert qualitative invariants (determinism, ordering, 0–100 rate
  bounds) that hold for both engines. No re-baselining was required for t-008.
- `finishTime` is reported on different internal scales by the two engines; the
  Race Sim UI only ever consumes one engine's scale at a time, so this is not a
  cross-engine display defect.
