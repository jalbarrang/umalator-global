---
name: codeql-triage
description: Generate the combined fallow + react-doctor codebase health report and decompose findings into prioritized beads issues. Use when user says "codeql", "triage issues", "run codeql", "code quality report", or wants to see what's wrong with the codebase.
---

# CodeQL Triage

Generates the codebase health report and decomposes findings into trackable beads issues. This skill is **read-only analysis + issue creation** — it does not fix anything.

## Workflow

### 1. Generate the report

```bash
bun run codeql:report
```

Output lands in `.reports/codeql-report-YYYY-MM-DD.md`.

### 2. Read the Triage Checklist

The report ends with a prioritized checklist (P0–P3). Read it and compare against existing beads issues to avoid duplicates.

### 3. Decompose into issues

Create beads issues using these grouping rules:

| Report finding           | Decomposition           | Title pattern                              |
| ------------------------ | ----------------------- | ------------------------------------------ |
| Circular dependencies    | 1 per cycle             | `Break circular dep: <shortest-path>`      |
| Unused files             | 1 per directory cluster | `Remove unused files in <dir>`             |
| Unused dependencies      | 1 for all               | `Remove unused dependencies`               |
| Large clones (>50 lines) | 1 per clone pair        | `Deduplicate <fileA> ↔ <fileB>`            |
| React-doctor warnings    | Group by component      | `Fix react-doctor warnings in <Component>` |
| Unused exports           | Group by module         | `Clean unused exports in <module>/`        |
| Unused class members     | Group by class          | `Prune unused members in <ClassName>`      |
| Unused types             | Batch all               | `Remove unused type exports`               |

Skip creating issues for trivial items fixable in under 30 seconds — note those for inline resolution instead.

### 4. Issue metadata

- **Labels**: `codeql` + one of: `dead-code`, `duplication`, `react-lint`, `circular-dep`
- **Priority**: match the report's P0/P1/P2/P3 level
- **Description**: list specific file paths, export names, and line numbers from the report

### 5. Regression check

If a previous report exists in `.reports/`, compare the scoreboard totals. Flag any category where the count increased since the last triage.

## Commands

| Command                       | Purpose                     |
| ----------------------------- | --------------------------- |
| `bun run codeql:report`       | Generate combined report    |
| `bun run codeql:fallow`       | Run fallow standalone       |
| `bun run codeql:react-doctor` | Run react-doctor standalone |
