# sunday-tools (DEPRECATED)

> **⚠️ Deprecated.** This TypeScript race-simulation engine has been superseded
> by the Rust/WASM engine (`packages/uma-sim-primitives` + `uma-sim-race` +
> `uma-sim-vacuum` → `packages/uma-sim-wasm`).
> It is **no longer wired into any production sim path** in the app.
>
> It is retained deliberately as:
> - the **statistical-parity reference** for the Rust engine
>   (see `docs/adr/0004-wasm-ts-statistical-parity.md` and
>   `src/lib/uma-sim-wasm/parity.test.ts`), and
> - a possible fallback if the WASM engine ever needs cross-checking.
>
> Do not add new dependencies on this package. New simulation work goes through
> the Rust core.

## Still-live duplication: the condition language (drift risk)

The deprecation above applies to the **simulation engine** (runner physics,
race loop, collectors) — that runtime is dead in production and lives on only as
the parity reference. **The skill condition-language parser is different:** it is
still imported by the app in **non-sim** paths and therefore exists in *two*
implementations that must stay semantically aligned:

| Concern | TS (`sunday-tools/skills/parser` + `skills/simulatability`) | Rust (`uma-sim-primitives::skills` condition language) |
|---|---|---|
| Skill filtering / search | `ConditionMatcher.treeMatch`, `createParser` (`skill-filter-lookup.ts`, `SkillFilterer.ts`) | — |
| Human-readable condition display | `createTypedParser` (`formatters.tsx`, `human-readable-formatter.tsx`, `conditions.ts`) | — |
| **Simulatability gate** (which skills the UI lets you simulate) | `skills/simulatability` via `SkillService` | — |
| **Actual activation / effect resolution at sim time** | — | the Rust catalog + dynamic registry |

**Drift caveat.** The UI decides *whether a skill is simulatable* and *how its
condition reads* using the **TS** parser, while the engine decides *whether it
actually fires* using the **Rust** parser. If the two diverge (a condition the
Rust engine learns to handle but the TS simulatability gate still rejects, or
vice-versa), the UI and the simulation disagree. The ADR-0004 per-skill parity
gate covers *activation/effect* behavior for a representative skill per family,
but it does **not** assert that the TS simulatability gate and the Rust
catalog agree on the *full* condition surface.

**Recommended follow-up (not yet built):** a small consistency test that, for
every skill in the dataset, asserts the TS `isSimulatable` verdict matches
whether the Rust catalog can resolve that skill's conditions (exported via a
WASM `canResolveConditions(skillId)` probe). Until then, treat any new condition
added to the Rust catalog as also requiring a TS-parser/simulatability update.

## Notes

- Consumed as **source** by the app (`exports` maps `sunday-tools/*` →
  `./src/*.ts`); `bun run build` (tsdown) exists to keep the library
  independently compilable.
- The engine has a circular dependency on the app's data layer (`@/*`,
  e.g. `CourseService` / `SkillService`); these are externalized in the tsdown
  build. See `tsdown.config.ts`.

---

Original engine documentation follows.

See [`src/README.md`](./src/README.md) for the original simulation-engine docs
(simulation modes, mechanics, etc.).
