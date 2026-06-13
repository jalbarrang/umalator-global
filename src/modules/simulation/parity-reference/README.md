# Parity reference (TS engine) — TEST-ONLY

> **This directory is NOT in the production path.** Nothing here is imported by
> the app, workers, or any `wasm-*` simulator. It is reached **only by tests.**

These modules are the legacy TypeScript `sunday-tools` simulation engine wired up
as the **statistical-parity oracle** for the Rust/WASM engine. They are the
reference implementation that [`src/lib/uma-sim-wasm/parity.test.ts`](../../../lib/uma-sim-wasm/parity.test.ts)
compares the WASM output against (see
[ADR-0004](../../../../docs/adr/0004-wasm-ts-statistical-parity.md) and
[ADR-0005](../../../../docs/adr/0005-split-sim-engines.md)).

The production simulation path is **100% WASM**: the UI and the `*-wasm.worker.ts`
workers drive `uma-sim-race` / `uma-sim-vacuum` through `uma-sim-wasm`. The only
reason this TS engine survives is to keep an independent oracle the parity gate
can measure against; **do not** call it from app/runtime code.

## Contents

| File | Oracle entry point | Mirrors (live WASM) |
|------|--------------------|---------------------|
| `ts-engine-harness.ts` | `createInitializedRace` — builds + initializes a TS `Race` | — |
| `skill-compare.reference.ts` | `runSkillComparison`, `runSampling` | `simulators/wasm-skill-compare.ts` |
| `vacuum-compare.reference.ts` | `runComparison` | `simulators/wasm-compare.ts` |
| `planner-compare.reference.ts` | `runPlannerComparison` | `simulators/wasm-skill-planner.ts` |
| `skill-combination.reference.ts` | `runSkillCombinationComparison`, `runBatchSkillEvaluation` | — |
| `optimization-engine.reference.ts` | `runAdaptiveOptimization` | `skill-planner/optimization-engine-wasm.ts` |

The small pure **settings builders** and **result types** (`createSkillCompareSettings`,
`createPlannerCompareSettings`, `SkillComparisonResult`, `PlannerCompare*`,
`OptimizationParams`, …) stay in their live `simulators/` / `skill-planner/`
modules because the `wasm-*` siblings reuse them; the reference modules import
them back from there so there is a single source of truth.
