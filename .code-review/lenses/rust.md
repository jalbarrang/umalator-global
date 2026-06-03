# Rust Simulation Engine

Evaluate changes to the `packages/uma-sim-*` Rust workspace — the DDD-structured
race-simulation engine compiled to native + WASM. The bar is deliberately strict:
this is a pure, deterministic library that runs inside browser web workers, so
panics, nondeterminism, and silent numeric drift are correctness bugs, not style
nits.

> **Opt-in lens.** Select explicitly (it is not in `defaultLenses`) because its
> tools compile the Rust workspace and take minutes. Run for diffs that touch
> `packages/**`.

## Tools

| Command                                                              | Purpose                                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `cd packages && cargo fmt --all --check`                             | Formatting check (rustfmt, width 100) — read-only, does **not** rewrite |
| `cd packages && cargo clippy --workspace --all-targets -- -D warnings` | Zero-warning lint gate (mirrors CI `cargo lint` alias). Compiles.       |
| `cd packages && cargo test --workspace --lib`                        | Unit tests — exits on its own.                                          |

> Excluded on purpose (belong in CI / `scripts/quality-gates.sh`): `cargo wasm`
> (release WASM build — slow, emits artifacts, skipped on non-rustup toolchains),
> `cargo-deny`, `typos`, `cargo-machete` (require `cargo install` and aren't
> guaranteed present locally). `.github/workflows/rust-ci.yml` covers all of them.

## Criteria

### Determinism (highest priority — protects WASM↔TS parity, ADR-0004)

- The simulation must be **bit-deterministic given a seed**. The only randomness
  source is the `xoshiro256**` PRNG in `shared_kernel/rng.rs` — flag any other
  entropy: `SystemTime::now`, `std::collections::hash_map::RandomState`,
  thread-id, address-based ordering, `rand::thread_rng`.
- Flag iteration over `HashMap`/`HashSet` where output **order matters** (results,
  collectors, serialized DTOs). Use `BTreeMap`/`IndexMap` or sort keys before
  iterating. Default `HashMap` iteration order is randomized per-process.
- No platform-dependent float behavior: avoid `f32`↔`f64` round-trips that the TS
  reference (`packages/sunday-tools`) doesn't make; keep the same widening order.
  The two engines use different PRNGs so exact parity is impossible, but the
  *deterministic* parts (course geometry, stat formulas, phase math) must match
  the TS reference numerically.

### No panics in library code (`disallowed-methods`, clippy.toml)

- `Result::unwrap` / `Option::unwrap` are **banned** in non-test code — use `?`,
  `.unwrap_or(..)`, `.unwrap_or_default()`, or `.expect("concrete reason")`.
- Flag new `panic!`, `unreachable!`, `todo!`, `unimplemented!`, slice indexing
  (`xs[i]`) on untrusted indices, and integer `/`/`%` that can hit zero. A panic
  inside `uma-sim-wasm` aborts the whole web worker — the anti-corruption layer
  must map failures to JS-friendly `Result`/error values, never unwind across FFI.
- Tests may opt out with `#[allow(clippy::disallowed_methods)]` — that's fine.

### Complexity & decomposition (clippy.toml thresholds)

- `cognitive-complexity-threshold = 20`, `too-many-lines-threshold = 120`. New
  long match/if chains or 120+ line fns must be split — follow the established
  `Runner` decomposition (`runner/{lifecycle,physics,skills,mechanics,stats}.rs`).
- `type-complexity-threshold = 250` — extract gnarly signatures into named types.

### Bounded contexts & layering (DDD)

- `uma-sim-primitives` = shared kernel + field-agnostic primitives (course, skills,
  stamina, runner step kernel). Must **not** depend on the race/vacuum field crates.
- `uma-sim-race` (contested multi-runner field) and `uma-sim-vacuum` (synthetic
  single-runner) are siblings — neither imports the other; both build on primitives.
- `uma-sim-wasm` is the anti-corruption layer: DTOs (`dto.rs`) + `wasm-bindgen`
  glue only. Keep domain logic out of it; it translates, it does not simulate.
- Flag a field crate's concern (dueling, pacing contest, mob field) leaking down
  into `uma-sim-primitives`.

### WASM boundary (`uma-sim-wasm`)

- DTOs must stay field-compatible with the TS `Wasm*` types in
  `src/lib/uma-sim-wasm/types.ts` — a renamed/retyped field silently breaks the
  JS adapter. Flag DTO shape changes not mirrored on the TS side.
- Maps crossing the boundary must serialize as JS objects
  (`serialize_maps_as_objects(true)`), not ES `Map`s — regressing this broke the
  app before (see ADR/Bug #1, `serialize HashMap outputs as JS objects`).
- No `unwrap`/`panic` reachable from an exported `#[wasm_bindgen]` fn.

### Safety, visibility, lint hygiene

- This is a **safe** library. Flag any new `unsafe` block without a
  `// SAFETY:` justification (`unsafe_op_in_unsafe_fn` is on).
- `unreachable_pub` is on — prefer `pub(crate)`; only widen to `pub` for the
  intended public API surface. Flag gratuitously `pub` internals.
- `#[allow(...)]` must carry a `reason = "..."` — flag bare allows that silently
  suppress the zero-warning bar.
- Flag `clippy::correctness` smells directly (these are `deny`): `redundant_clone`,
  needless `.to_string()`, `.clone()` on `Copy` types, `.map().unwrap_or()` that
  should be `map_or`, manual `let ... else`.

### Testing

- New domain/formula logic needs `#[cfg(test)]` unit tests in-crate. The TS
  reference engine is the oracle — port its expected values where feasible.
- Parity-sensitive changes (course coefficients, stat/phase formulas, spurt,
  stamina policy) should reference the TS source they mirror in a comment.

## Severity Guide

- **error**: `unwrap`/`panic!`/`unreachable!` in non-test code (esp. reachable from
  WASM exports); new nondeterminism in the sim core (PRNG-bypass, order-dependent
  `HashMap` iteration); `unsafe` without `// SAFETY:`; `clippy::correctness`
  violations; WASM DTO shape change not mirrored in `types.ts`; map serialized as
  `Map` instead of JS object across the boundary.
- **warning**: cognitive complexity > 20 or fn > 120 lines; cross-context layering
  leak; `#[allow]` missing `reason`; gratuitously `pub` internals; missing tests
  for new formula logic; redundant clones / needless allocations on hot paths.
- **info**: doc-comment hygiene, naming, opportunities to share a primitive instead
  of re-deriving it in a field crate.
