---
name: codeql-fix
description: Resolve codebase health issues from the codeql report or beads issues. Picks the right fix strategy per issue type — mechanical auto-fix for dead code, judgment-driven refactoring for circular deps and duplication. Use when user says "fix codeql issues", "fix dead code", "clean up codebase", "work on code quality", or "just fix what you can".
---

# CodeQL Fix

Resolves codebase health issues surfaced by fallow and react-doctor. Claims beads issues or works directly from the report.

## Workflow

### 1. Find work

Check for open beads issues labeled `codeql`:

```
bd ready
```

If no issues exist, read the latest `.reports/codeql-report-*.md` and work from the Triage Checklist directly.

### 2. Pick and claim

Claim the highest-priority open issue. Work one issue at a time.

### 3. Fix using the right strategy

Each issue type has a different fix approach. See [FIX-STRATEGIES.md](./FIX-STRATEGIES.md) for the full playbook.

**Quick reference — what's safe to auto-fix vs. what needs judgment:**

| Safe to auto-fix | Needs judgment |
| --- | --- |
| Unused files (delete + typecheck) | Circular dependencies |
| Unused exports (`codeql:fallow:fix`) | Code duplication / large clones |
| Unused dependencies (`bun remove`) | React-doctor warnings |
| Unused types (remove export or delete) | Unused class members on service classes |

### 4. Verify

After every fix:

1. `bun run typecheck` — no type errors
2. `bun run test` — no test failures
3. `bun run codeql:report` — confirm issue count dropped

Close the beads issue only when the target category count decreased.

### 5. Quick-fix mode

When the user says "just fix what you can" — work through mechanical fixes without claiming issues:

1. `bun run codeql:fallow:fix` — auto-removes unused exports and deps
2. Delete unused files listed in the report
3. Remove confirmed unused dev dependencies
4. `bun run test && bun run typecheck`
5. Regenerate report and show before/after delta

## Commands

| Command | Purpose |
| --- | --- |
| `bun run codeql:report` | Regenerate report to verify fixes |
| `bun run codeql:fallow:fix` | Auto-fix safe fallow issues |
| `bun run typecheck` | Verify no type errors after changes |
| `bun run test` | Verify no test failures after changes |
