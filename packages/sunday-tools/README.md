# sunday-tools (DEPRECATED)

> **⚠️ Deprecated.** This TypeScript race-simulation engine has been superseded
> by the Rust/WASM engine (`packages/uma-sim-core` → `packages/uma-sim-wasm`).
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
