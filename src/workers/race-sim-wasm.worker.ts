import '../polyfills';
import type {
  RaceSimParams,
  RaceSimResult,
} from '@/lib/sunday-tools/race-sim/run-race-sim';
import type { CreateRunner } from '@/lib/sunday-tools/common/runner';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { initUmaSimWasm, runRaceSim } from '@/lib/uma-sim-wasm/loader';
import {
  raceSimParamsToWasm,
  wasmResultToRaceSimResult,
} from '@/lib/uma-sim-wasm/adapter';

export type RaceSimWasmWorkerParams = RaceSimParams;

export type RaceSimWasmWorkerInMessage = {
  type: 'race-sim-run';
  data: RaceSimWasmWorkerParams;
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

function resolveRunnerName(runner: CreateRunner, index: number): string {
  const info = runner.outfitId ? getUmaDisplayInfo(runner.outfitId) : null;
  return info?.name ?? `Runner ${index + 1}`;
}

self.addEventListener(
  'message',
  async (event: MessageEvent<RaceSimWasmWorkerInMessage>) => {
    const message = event.data;
    if (message.type !== 'race-sim-run') {
      return;
    }

    try {
      await initUmaSimWasm();
      const wasmParams = raceSimParamsToWasm(message.data, resolveRunnerName);
      // The WASM result is plain JSON — no Map serialization needed.
      const wasmResult = await runRaceSim(wasmParams);
      const result = wasmResultToRaceSimResult(wasmResult);
      sendMessage({ type: 'race-sim-complete', data: result });
    } catch (error) {
      sendMessage({
        type: 'race-sim-error',
        error:
          error instanceof Error
            ? error.message
            : 'Unknown WASM race simulation error',
      });
    }
  },
);
