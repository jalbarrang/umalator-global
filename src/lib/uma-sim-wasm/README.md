# uma-sim-wasm (TS integration)

TypeScript glue for the Rust race-simulation engine compiled to WebAssembly
(`packages/uma-sim-wasm`). The TS side stays the **skill-data repository**: it
resolves skill ids to their raw alternatives/conditions and ships them to WASM,
which owns the condition parsing + simulation.

## Files

- `types.ts` — TS mirrors of the WASM boundary DTOs (numeric enums, camelCase).
- `pkg-types.d.ts` — ambient types for the wasm-pack-generated `./pkg` module.
- `adapter.ts` — `courseDataToWasm`, `createRunnerToWasm` (resolves skills via
  `skillsService`), `resolveSkillInput`, `wasmResultToAppResult`.
- `loader.ts` — async init (`initUmaSimWasm`) + `runRaceSim` (batch) +
  `createRaceSimulator` (streaming, per-tick callbacks).
- `pkg/` — **generated** by `bun run wasm:build` (git-ignored).

## Building the WASM bundle

The default `cargo` on some dev machines is a standalone install that lacks the
`wasm32` std; the build script forces the **rustup `stable`** toolchain (which
has `wasm32-unknown-unknown` installed). One-time prereqs:

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack            # or: cargo binstall wasm-pack
```

Then:

```bash
bun run wasm:build
# -> writes src/lib/uma-sim-wasm/pkg/{uma_sim_wasm.js,_bg.wasm,...}
```

CI builds the `.wasm` with the rustup toolchain as well. Verified locally:
`cargo build -p uma-sim-wasm --target wasm32-unknown-unknown --release` produces
`target/wasm32-unknown-unknown/release/uma_sim_wasm.wasm` (~1 MB pre-bindgen).

Vite needs to serve the `.wasm`; `--target web` emits an ES module that
fetch-instantiates it. If imports fail, add `vite-plugin-wasm` +
`vite-plugin-top-level-await`.

## Batch usage

```ts
import { runRaceSim } from '@/lib/uma-sim-wasm/loader';
import { courseDataToWasm, createRunnerToWasm } from '@/lib/uma-sim-wasm/adapter';

const result = await runRaceSim({
  course: courseDataToWasm(course),
  parameters: { ground: 1, weather: 1, season: 1, timeOfDay: 2, grade: 100 },
  settings: { mode: 'normal', skillSamples: 1 },
  runners: appRunners.map(createRunnerToWasm), // exactly 9
  nsamples: 100,
  masterSeed: 1234,
  focusRunnerIds: [0],
});

console.log(result.finishOrders[0]); // winner first
console.log(result.collected[0].focus[0].samples); // focus-runner trace
```

## Streaming usage (live per-tick callbacks)

```ts
import { createRaceSimulator } from '@/lib/uma-sim-wasm/loader';

const run = await createRaceSimulator(params, {
  onRoundStart: (seed) => console.log('round', seed),
  onAfterRunnerTick: (snap) => chart.push(snap.runnerId, snap.position),
  onRoundEnd: () => console.log('done'),
});
const result = run(); // drives all rounds, callbacks fire live
```

## Web worker

The WASM module is initialized once per worker realm (`initUmaSimWasm` is
idempotent). A minimal worker:

```ts
// race-sim.worker.ts
import { runRaceSim } from '@/lib/uma-sim-wasm/loader';

self.onmessage = async (e) => {
  const result = await runRaceSim(e.data);
  self.postMessage(result);
};
```

```ts
// caller
const worker = new Worker(new URL('./race-sim.worker.ts', import.meta.url), {
  type: 'module',
});
worker.onmessage = (e) => render(e.data);
worker.postMessage(params);
```

## Frontend integration (wired)

The WASM engine slots **inside** the existing race-sim worker pattern — it is the
engine, not a replacement for the worker/hook/store path.

- `src/workers/race-sim-wasm.worker.ts` — mirrors `race-sim.worker.ts` but
  `await initUmaSimWasm()` + runs the WASM `runRaceSim`, converting inputs via
  `raceSimParamsToWasm` and reshaping the output via `wasmResultToRaceSimResult`.
  It accepts/returns the **same** `RaceSimParams` / `RaceSimResult` contract as
  the TS worker, so it is a drop-in.
- `useRaceSimRunner({ engine: 'wasm' })` selects the WASM worker; `engine`
  defaults to `'ts'` (legacy engine). No store/route changes are required —
  callers opt in by passing `engine`.

### Result-shape bridge

The WASM `RaceSimResult` is leaner than the TS one. `wasmResultToRaceSimResult`
reconstructs the rich `collectedData` the UI consumes:

- It forces `focusRunnerIds` to the **full field** so every runner's per-tick
  position/lane/speed/hp is captured, then rebuilds `allRunnerPositions`,
  `allRunnerLanes`, and `focusRunnerData` from those traces.
- `eventLogs` is **empty per round**, and `focusRunnerData` fields the WASM
  telemetry does not capture (pacer gap, skill-activation markers, rushed /
  dueling / spot-struggle regions) default to neutral values. Playback and the
  track view work; skill-activation overlays do not until the rich event-log
  projection (deferred t-018 work) is wired across the boundary.

### Prerequisites (must run before the WASM engine can load)

```bash
cargo install wasm-pack    # one-time; not currently installed
bun run wasm:build         # emits src/lib/uma-sim-wasm/pkg/ (--target web)
```

The existing Vite config (`assetsInclude: ['**/*.wasm']` + `worker.format: 'es'`)
is sufficient for the `--target web` bundle — the loader dynamically imports the
generated JS glue (which fetches its own `.wasm`), so `vite-plugin-wasm` /
`vite-plugin-top-level-await` are **not** required.
