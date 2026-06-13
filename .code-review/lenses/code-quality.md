# Code Quality

Evaluate changes for correctness, consistency, and adherence to this project's established conventions.

## Tools

| Command                 | Purpose                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `bun run typecheck`     | TypeScript type checking (tsgo, read-only `--noEmit`)        |
| `bun run lint`          | Linting via oxlint (with `.oxlintrc.json` + `oxlint-rules/`) |
| `bunx oxfmt --check`    | Format check only — does **not** rewrite files (`bun run format` would)  |
| `bun run test`          | Unit tests via vitest (`vitest run`, exits — not watch)      |

## Criteria

### TypeScript & Type Safety

- No `any` casts without justification
- Use `type` instead of `interface` for component props (**17 files currently violate this** — new code must not add more)
- No loose type assertions (`as unknown as X` patterns)
- Leverage discriminated unions for domain state (runner state, simulation results)

### React Patterns (React 19+ / React Compiler)

- Props destructured **inside** the component body, not in the function signature
- No `forwardRef` — pass `ref` as a prop (only 2 legacy files remain: `scroll-area.tsx`, `command.tsx`)
- No `asChild` Radix patterns — use Base UI `render={...}` composition (25+ files follow this correctly)
- No unnecessary `useEffect` for derived state — prefer computed values, event handlers, or let React Compiler handle memoization
- Since React Compiler is enabled via `babel-plugin-react-compiler`, manual `useMemo`/`useCallback`/`memo` should only be used where the compiler can't optimize (e.g., cross-component context values, web workers). Flag gratuitous manual memoization in new code
- No React Server Component patterns — this is a client-only Vite SPA
- Check local `src/components/ui/` wrapper APIs before assuming shadcn/Radix idioms

### State Management

- Zustand stores: global stores in `src/store/`, feature stores co-located in `src/modules/**/stores/`
- Persisted stores use `persist()` with `createJSONStorage(() => localStorage)` and explicit `partialize`
- Store actions mutate state directly via exported functions (no Immer `produce` in stores — Immer is used elsewhere)
- Selectors use `useShallow` where appropriate (enforced by oxlint rule `react-props/require-use-shallow`)
- React Query is minimal (only course geometry) — don't introduce new `useQuery` hooks without justification

### Data Layer

- Data loading follows the static JSON → loader → singleton service pattern (`src/modules/data/`)
- No Zod schemas exist in `src/` — runtime validation is manual; don't introduce Zod without discussion
- Domain terms must match CONTEXT.md glossary (Runner, Outfit, Aptitude Grade, Innate Aptitudes, etc.)

### i18n

- Uses global `i18n.t()` calls, **not** `useTranslation()` hook
- New user-facing strings should go through `src/i18n/` translation resources

### Imports & Modules

- No barrel files — use named exports only (currently clean: 0 `export *` in src)
- A few `index.ts` re-export surfaces exist (`components/tutorial/`, `modules/simulation/share/`) — don't expand this pattern
- Import paths use tsconfig path aliases (`@/...`), keep them clean

### Testing

- New domain/transform logic needs unit tests (vitest + `@testing-library/react`)
- Tests use `@testing-library/react` patterns, not implementation details
- Data loaders and services have strong coverage — maintain this standard
- Component tests are sparse — adding them for complex interactive components is encouraged
- Store tests are absent — flag if a new store has non-trivial logic without tests

## Severity Guide

- **error**: Type unsafety, `forwardRef` in new code, broken store patterns, `interface` props in new components
- **warning**: Unnecessary `useEffect`, gratuitous manual memoization, missing tests for non-trivial logic
- **info**: Suggestions to align with existing patterns, opportunities to improve
