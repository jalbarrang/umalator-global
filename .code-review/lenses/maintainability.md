# Maintainability

Evaluate changes for long-term readability, modularity, and alignment with the project's codeql health metrics.

## Tools

| Command                       | Purpose                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `bun run codeql:fallow`       | Fallow standalone, read-only (dead exports, unused files, circular deps, code clones)     |
| `bun run codeql:react-doctor` | React-doctor standalone, read-only (React-specific diagnostics, scored)                   |

> `bun run codeql:fallow:fix` and `bun run codeql:report` are intentionally **not** review tools: `fix` mutates files, and `report` re-runs the heavier combined pipeline. Run those manually.

## Criteria

### Module & Feature Organization

- Features live in `src/modules/<feature>/` with co-located `components/`, `stores/`, `hooks/`, and domain logic
- Shared UI components live in `src/components/ui/` (design system) or `src/components/<feature>/` (cross-feature presentational)
- Global stores in `src/store/`, feature stores in `src/modules/**/stores/` — don't cross-wire feature stores into unrelated modules
- Data layer (`src/modules/data/`) owns all JSON loading, transformation, and service singletons — UI code imports services, not raw data
- `src/lib/sunday-tools/` is the low-level engine library — changes here must be pure and independently testable
- `src/utils/` is for cross-feature helpers — keep focused and small
- Scripts (`scripts/`) stay independent of UI code

### Dead Code & Hygiene (fallow)

- No new unused exports — fallow tracks these; verify with `bun run codeql:fallow`
- No new unused files — delete rather than comment out
- No commented-out code in diffs
- Removed features must be fully cleaned up (components, styles, routes, store slices)
- Don't introduce new dependencies without justification — prefer `es-toolkit` over adding lodash-style packages

### Circular Dependencies

- No new circular dependency cycles — fallow flags these as P0
- Watch for indirect cycles through store imports or cross-module service dependencies
- If breaking a cycle, prefer dependency inversion or extracting shared types to a common module

### Code Duplication

- Fallow detects clone groups — flag changes that copy-paste >20 lines from existing code
- Extract shared logic into `src/utils/` or a module-level helper
- Simulation logic and data transforms are the highest-risk areas for duplication

### Complexity & Readability

- Functions and components should have single responsibility
- No deeply nested conditionals — extract early returns or helper functions
- Complex simulation/calculation logic must be extractable and testable in isolation (not coupled to React components)
- Magic numbers must use named constants, especially aptitude encodings (S=0..G=7), distance thresholds, and simulation parameters

### Naming & Domain Language

- Variable and function names must reflect CONTEXT.md domain language: Runner (not "uma" in new code), Outfit (not "variant"), Aptitude Grade, Innate Aptitudes
- Component file names match the exported component name
- Store files follow `<feature>.store.ts` naming convention

### Code Splitting & Bundle

- Routes are mostly eagerly imported — new heavy routes should consider `React.lazy`
- Heavy chart/visualization components should follow the `lazy-bassin-charts.ts` pattern
- React Compiler handles most render optimization — don't add manual memoization as a substitute for proper component structure

### Change Isolation

- Changes should be scoped — flag large PRs (>500 lines changed) for potential splitting
- Refactors should be separated from feature changes where possible
- Store shape changes need migration consideration (persisted to localStorage)

### React-Doctor Score

- The react-doctor score should not regress — check before/after with `bun run codeql:report`
- Group react-doctor warnings by component when reporting issues
- Priority levels follow the codeql triage checklist: P0 (circular deps, unresolved imports) → P1 (unused deps/files, RD errors) → P2 (large clones, RD warnings) → P3 (unused exports/types)

## Severity Guide

- **error**: New circular dependencies, tight coupling between unrelated modules, duplicated domain logic >20 lines, new unused files/dependencies
- **warning**: Overly broad modules, naming mismatches with domain glossary, missing code splitting for heavy components, react-doctor score regression
- **info**: Opportunities to simplify, consolidate, or improve test coverage for stores
