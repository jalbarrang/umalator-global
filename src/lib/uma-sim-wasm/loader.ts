// Async loader for the wasm-pack (`--target web`) module. Initializes the WASM
// instance once per worker/realm and exposes the typed batch + streaming APIs.
//
// The generated bundle lives at `./pkg/uma_sim_wasm.js` after `bun run
// wasm:build`. We import it through a *variable* specifier so the typechecker
// does not require the generated artifact to be present, while Vite still
// resolves it at build time.

import type {
  RunnerTickSnapshot,
  WasmRaceSimParams,
  WasmRaceSimResult,
} from './types';

/** The shape of the wasm-pack-generated module we depend on. */
type UmaSimWasmModule = {
  default: (input?: unknown) => Promise<unknown>;
  runRaceSim: (params: WasmRaceSimParams) => WasmRaceSimResult;
  WasmRaceSimulator: new (params: WasmRaceSimParams) => WasmRaceSimulatorHandle;
};

type WasmRaceSimulatorHandle = {
  setOnRoundStart: (cb: (seed: number) => void) => void;
  setOnBeforeTick: (cb: (dt: number) => void) => void;
  setOnAfterRunnerTick: (cb: (snapshot: RunnerTickSnapshot) => void) => void;
  setOnRunnerFinished: (cb: (runnerId: number) => void) => void;
  setOnRoundEnd: (cb: () => void) => void;
  run: () => WasmRaceSimResult;
};

const PKG_SPECIFIER = './pkg/uma_sim_wasm.js';

let modulePromise: Promise<UmaSimWasmModule> | null = null;

async function loadModule(): Promise<UmaSimWasmModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const mod = (await import(/* @vite-ignore */ PKG_SPECIFIER)) as UmaSimWasmModule;
      await mod.default();
      return mod;
    })();
  }
  return modulePromise;
}

/** Initialize the WASM module exactly once (idempotent). */
export async function initUmaSimWasm(): Promise<void> {
  await loadModule();
}

/** Run a batch simulation. Ensures the module is initialized first. */
export async function runRaceSim(
  params: WasmRaceSimParams
): Promise<WasmRaceSimResult> {
  const mod = await loadModule();
  return mod.runRaceSim(params);
}

/** Streaming callbacks for {@link createRaceSimulator}. */
export type RaceSimCallbacks = {
  onRoundStart?: (seed: number) => void;
  onBeforeTick?: (dt: number) => void;
  onAfterRunnerTick?: (snapshot: RunnerTickSnapshot) => void;
  onRunnerFinished?: (runnerId: number) => void;
  onRoundEnd?: () => void;
};

/**
 * Build a streaming simulator. Callbacks fire live during the returned `run()`;
 * the serialized batch result is returned when all rounds complete.
 */
export async function createRaceSimulator(
  params: WasmRaceSimParams,
  callbacks: RaceSimCallbacks = {}
): Promise<() => WasmRaceSimResult> {
  const mod = await loadModule();
  const sim = new mod.WasmRaceSimulator(params);
  if (callbacks.onRoundStart) sim.setOnRoundStart(callbacks.onRoundStart);
  if (callbacks.onBeforeTick) sim.setOnBeforeTick(callbacks.onBeforeTick);
  if (callbacks.onAfterRunnerTick) sim.setOnAfterRunnerTick(callbacks.onAfterRunnerTick);
  if (callbacks.onRunnerFinished) sim.setOnRunnerFinished(callbacks.onRunnerFinished);
  if (callbacks.onRoundEnd) sim.setOnRoundEnd(callbacks.onRoundEnd);
  return () => sim.run();
}
