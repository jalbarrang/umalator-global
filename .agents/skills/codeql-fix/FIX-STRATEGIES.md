# Fix Strategies

## 🔴 P0 — Circular dependencies

**Needs judgment.** Do not auto-fix.

1. Scout both ends of the cycle to understand _why_ the dependency exists.
2. Identify the thinnest edge to break — usually a type import that can be extracted to a shared definitions file.
3. Common patterns:
   - Extract shared types to a `types.ts` or `definitions.ts` in a parent directory
   - Invert the dependency with dependency injection or a callback
   - Move the function that creates the cycle to the module that already depends on the other
4. Run `bun run codeql:fallow` to confirm the cycle is gone.
5. Run `bun run test` to verify nothing broke.

## 🔴 P1 — Unused files

**Mechanical.** Safe to auto-fix with verification.

1. Before deleting, check git blame — if the file was touched in the last 2 weeks, it may be WIP. Ask before deleting.
2. Delete the files.
3. Run `bun run typecheck` to confirm no broken imports.
4. If typecheck fails, a supposedly-unused file was imported dynamically — investigate.

## 🔴 P1 — Unused dependencies

**Mostly mechanical.** Verify before removing.

1. For each dependency, check if it's loaded dynamically (e.g. via `import()`, Vite glob imports, or referenced in config files like `vite.config.ts`, `commitlint.config.js`).
2. `bun remove <pkg>` for confirmed unused deps.
3. Run `bun run build` to verify the production build still works.

## 🟠 P2 — Large clones

**Needs judgment.** Do not auto-fix.

1. Use a scout to read both sides of the clone and understand their differences.
2. Decide on the extraction strategy:
   - **Identical logic, different types** → generic function or shared hook with type parameter
   - **Identical logic, different data sources** → extract the logic, parameterize the source
   - **Mostly identical with small branches** → extract shared core, keep divergent parts in callers
3. After refactoring, verify both call sites still work with `bun run test`.

## 🟡 P2 — React-doctor warnings

**Needs judgment.** Work per-component.

| Rule                             | Fix strategy                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `no-giant-component`             | Split into subcomponents. Keep state in the parent, push rendering down.          |
| `prefer-useReducer`              | Extract related useState calls into a reducer when state transitions are coupled. |
| `prefer-dynamic-import`          | Wrap heavy library imports in `React.lazy()`.                                     |
| `no-cascading-set-state`         | Derive state or combine into a reducer.                                           |
| `async-await-in-loop`            | Collect promises and `Promise.all()`.                                             |
| `client-passive-event-listeners` | Add `{ passive: true }` if the handler doesn't call `preventDefault()`.           |
| `no-tiny-text`                   | Increase font size to at least 12px.                                              |
| `no-inline-exhaustive-style`     | Extract to a CSS class or Tailwind utilities.                                     |

## 🟡 P3 — Unused exports / class members / types

**Mechanical.** Can batch.

1. Run `bun run codeql:fallow:fix` to auto-remove unused exports.
2. For class members: manually remove or mark as `@internal` if they're part of a public API that may be used externally.
3. For types: remove the export keyword if the type is used locally, or delete if truly dead.
4. Run `bun run typecheck` after each batch.

## What NOT to auto-fix

- Circular dependencies — structural, needs design thinking
- Code duplication — needs understanding of intent and divergence
- React-doctor warnings — component-level judgment calls
- Unused class members on service classes — may be used via dependency injection or reflection
- Unused exports in `definitions.ts` / `types.ts` files — may be part of a domain vocabulary used externally
