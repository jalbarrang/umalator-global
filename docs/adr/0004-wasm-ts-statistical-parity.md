# ADR-0004: WASM-vs-TS Statistical-Parity Sign-off (Migration Go/No-Go)

## Status

Accepted

## Context

The simulation migration replaces the TypeScript `sunday-tools` engine with the
Rust core compiled to WASM (`packages/uma-sim-core` → `packages/uma-sim-wasm`).
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

## Notes / findings

- One **small systematic** mid-pack difference persists across sample sizes: a
  mid-pack Front Runner (gate 4) ranks ~0.87 place better under WASM than TS. It
  is bounded well under one position and within the agreed tolerance, but is a
  genuine engine difference (not pure sampling noise) and is a candidate for
  future investigation if mid-pack ordering ever needs to be tightened.
- No existing test asserted specific TS-engine magic numbers; the simulator test
  suites assert qualitative invariants (determinism, ordering, 0–100 rate
  bounds) that hold for both engines. No re-baselining was required for t-008.
- `finishTime` is reported on different internal scales by the two engines; the
  Race Sim UI only ever consumes one engine's scale at a time, so this is not a
  cross-engine display defect.
