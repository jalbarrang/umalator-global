import '../polyfills';
import type { RaceSimParams, RaceSimResult } from 'sunday-tools/race-sim/run-race-sim';
import type { WasmRaceSimParams } from '@/lib/uma-sim-wasm/types';
import { initUmaSimWasm, runRaceSim } from '@/lib/uma-sim-wasm/loader';
import { wasmResultToRaceSimResult } from '@/lib/uma-sim-wasm/adapter-results';

/** Public input the caller builds (main-thread converts it to WASM params). */
export type RaceSimWasmWorkerParams = RaceSimParams;

export type RaceSimWasmWorkerInMessage = {
  type: 'race-sim-run';
  // Pre-resolved on the main thread; the worker never touches the dataset.
  data: WasmRaceSimParams;
};

export type RaceSimWasmWorkerOutMessage =
  | {
      type: 'race-sim-complete';
      data: RaceSimResult;
    }
  | {
      type: 'race-sim-error';
      error: string;
    };

function sendMessage(message: RaceSimWasmWorkerOutMessage): void {
  postMessage(message);
}

self.addEventListener('message', async (event: MessageEvent<RaceSimWasmWorkerInMessage>) => {
  const message = event.data;
  if (message.type !== 'race-sim-run') {
    return;
  }

  try {
    await initUmaSimWasm();
    // The WASM result is plain JSON — no Map serialization needed.
    const wasmResult = await runRaceSim(message.data);
    const result = wasmResultToRaceSimResult(wasmResult);
    sendMessage({ type: 'race-sim-complete', data: result });
  } catch (error) {
    sendMessage({
      type: 'race-sim-error',
      error: error instanceof Error ? error.message : 'Unknown WASM race simulation error'
    });
  }
});
