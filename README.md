# Torena Sim

[![PR Checks](https://github.com/jalbarrang/umalator-global/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/jalbarrang/umalator-global/actions/workflows/pr-checks.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Torena Sim is a race and skill simulation toolkit for **Uma Musume: Pretty Derby** Global server.
It helps players, theorycrafters, and tool builders test race behavior with repeatable simulations instead
of relying only on in-game trial runs.

## Project Context

This repository combines:

- A web app for configuring race scenarios and visualizing outputs.
- A simulation engine for speed, acceleration, stamina, and skill activation behavior.
- Data tooling and scripts for extracting, syncing, and validating skill and course data.

The goal is to provide a practical environment for understanding how different builds and race conditions
affect performance.

## What It Is Used For

Use this project when you want to:

- Compare skill loadouts under the same race setup.
- Evaluate skill activation consistency and expected value.
- Inspect velocity and distance trends across many simulation runs.
- Iterate on runner stats, strategy, and conditions before testing in-game.
- Debug or experiment with simulation logic through local scripts.

## Quick Start

### Install and Run

```bash
bun install
bun run dev
```

Open the local URL printed by Vite to use the simulator UI.

### Sync Game Data

Fetch the entity catalog (skills, umas, support cards) from GameTora:

```bash
bun run sync:data
```

This writes snapshots to `src/modules/data/json/gametora/` and only re-fetches data that has changed since the last sync.

For course geometry, fetch the latest `master.mdb` and extract:

```bash
bun run db:fetch        # Download master.mdb to ./db
bun run extract:all     # Extract course geometry
```

See [docs/data-extraction/data-pipeline.md](docs/data-extraction/data-pipeline.md) for the full pipeline details.

## Deployment

Production deploys are triggered automatically when a new **GitHub Release** is published (via [release-please](https://github.com/googleapis/release-please)).

Two deploy targets run in parallel:

| Target           | Workflow                               | URL                                |
| ---------------- | -------------------------------------- | ---------------------------------- |
| **GitHub Pages** | `.github/workflows/deploy-pages.yml`   | Configured in repo Pages settings  |
| **Netlify**      | `.github/workflows/deploy-netlify.yml` | https://sundays-shadow.netlify.app |

Both workflows can also be triggered manually via `workflow_dispatch`.

### Required Secrets & Variables

| Name                       | Type     | Used by                                                                                                   |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `DATA_UPDATE_PAT`          | Secret   | `versioning.yml` — PAT used by release-please so the `release: published` event triggers deploy workflows |
| `NETLIFY_AUTH_TOKEN`       | Secret   | Netlify deploy                                                                                            |
| `NETLIFY_SITE_ID`          | Secret   | Netlify deploy                                                                                            |
| `VITE_PUBLIC_POSTHOG_KEY`  | Secret   | Build-time analytics key                                                                                  |
| `VITE_PUBLIC_POSTHOG_HOST` | Variable | Build-time analytics host                                                                                 |
| `VITE_BASE_PATH`           | Variable | GitHub Pages base path                                                                                    |

## Useful Commands

- `bun run dev`: start local development server
- `bun run build`: build production assets
- `bun run preview`: preview built app
- `bun run typecheck`: run TypeScript checks
- `bun run lint`: run ESLint
- `bun run test`: run test suite
- `bun run sync:data`: sync entity catalog from GameTora
- `bun run db:fetch`: download latest `master.mdb` to `./db`
- `bun run extract:all`: extract course geometry from `master.mdb`

## Acknowledgements

This project is inspired by and built on the work of the Uma simulation community.
Special thanks to:

- **alpha123** for the original simulator and UI foundations.
- **Transparent Dino**, **jechtoff2dudes** and **Kachi** for extensive fixes, systems rework, and simulator enhancements made in VFalator.
- **[GameTora](https://gametora.com/)** for game data, including the entity catalog (skills, umas, support cards), event rewards, and skill hint mappings that power this tool.

## Copyright and Fair Use Notice

Uma Musume: Pretty Derby, its characters, names, artwork, game assets, and related trademarks are the property of
**Cygames, Inc.** and their respective rights holders.

This project is an independent, fan-made simulation and analysis tool. It is not affiliated with, endorsed by, or
sponsored by Cygames, Inc.

Any referenced game data, terminology, or limited derivative material is used for commentary, research, education,
and interoperability purposes. This repository is intended to fall under applicable **fair use / fair dealing**
principles and equivalent exceptions under relevant copyright laws.
