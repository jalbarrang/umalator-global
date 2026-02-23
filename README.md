# Sunday's Shadow

[![PR Checks](https://github.com/jalbarrang/umalator-global/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/jalbarrang/umalator-global/actions/workflows/pr-checks.yml)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](./LICENSE)
[![Bun](https://img.shields.io/badge/Bun-runtime-black?logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Netlify Status](https://api.netlify.com/api/v1/badges/cd1b22d2-3701-4fca-8c07-dda42d57a259/deploy-status)](https://sundays-shadow.netlify.app/)

Sunday's Shadow is a race and skill simulation toolkit for **Uma Musume: Pretty Derby** Global server.
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

### Requirements

- [Bun](https://bun.sh/) (runtime and package manager)

### Install and Run

```bash
bun install
bun run dev
```

Open the local URL printed by Vite to use the simulator UI.

### Fetch `master.mdb` (Optional but recommended)

If you want to run local extraction scripts with fresh game data, fetch the latest master database into `./db`:

```bash
bun run db:fetch
```

This script downloads `master.mdb` to `db/master.mdb`, which extraction scripts use automatically.

## Useful Commands

- `bun run dev`: start local development server
- `bun run build`: build production assets
- `bun run preview`: preview built app
- `bun run typecheck`: run TypeScript checks
- `bun run lint`: run ESLint
- `bun run test`: run test suite
- `bun run db:fetch`: download latest `master.mdb` to `./db`
- `bun run skill:compare`: run skill comparison debug script

## Acknowledgements

This project is inspired by and built on the work of the Uma simulation community.
Special thanks to:

- **alpha123** for the original simulator and UI foundations.
- **Transparent Dino**, **jechtoff2dudes** and **Kachi** for extensive fixes, systems rework, and simulator enhancements made in VFalator.
- **Gametora** for all the data used in this project.

## Copyright and Fair Use Notice

Uma Musume: Pretty Derby, its characters, names, artwork, game assets, and related trademarks are the property of
**Cygames, Inc.** and their respective rights holders.

This project is an independent, fan-made simulation and analysis tool. It is not affiliated with, endorsed by, or
sponsored by Cygames, Inc.

Any referenced game data, terminology, or limited derivative material is used for commentary, research, education,
and interoperability purposes. This repository is intended to fall under applicable **fair use / fair dealing**
principles and equivalent exceptions under relevant copyright laws.
