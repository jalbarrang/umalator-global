# ADR-0006: Retire the TypeScript Simulation Oracle

## Status

Accepted

Supersedes [ADR-0004](0004-wasm-ts-statistical-parity.md) and the oracle-retention portion of [ADR-0005](0005-split-sim-engines.md).

## Context

ADR-0004 used the legacy TypeScript simulation engine as a statistical-parity oracle during the Rust/WASM migration. ADR-0005 then split the Rust implementation into purpose-built engines over shared primitives while keeping the TS oracle as a temporary migration safety net.

The Rust/WASM engine is now the only production simulation path. The live TypeScript app still owns UI/domain DTOs under `src/lib/uma-domain/`, but the legacy `packages/sunday-tools` engine, parity harness, and TS-oracle tests no longer provide ongoing product value. Keeping them creates a second, stale simulation implementation and forces future mechanics work to maintain dead code.

## Decision

Delete the legacy TypeScript simulation engine and parity oracle:

- remove `packages/sunday-tools`;
- remove `src/modules/simulation/parity-reference`;
- remove WASM-vs-TS parity tests and TS-oracle-only simulator tests;
- remove the `sunday-tools/*` path alias and package-level tooling wiring.

Going forward, Rust/WASM is the single simulation engine. Regression coverage lives in Rust crate tests, WASM adapter tests, and app-level tests for DTO conversion, stores, sharing, and UI behavior.

## Consequences

- Future engine changes no longer have an independent TypeScript statistical oracle.
- Mechanics fidelity work happens in Rust first, with TypeScript limited to domain DTOs, UI state, adapters, and debug tooling.
- The app no longer carries duplicate race-physics code.
