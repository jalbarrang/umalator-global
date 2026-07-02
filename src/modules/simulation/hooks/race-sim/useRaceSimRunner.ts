import { useCallback, useEffect, useRef, useState } from 'react';
import RaceSimWasmWorker from '@workers/race-sim-wasm.worker.ts?worker';
import type { CreateRunner } from '@/lib/uma-domain/runner/types';
import type { RaceSimResult } from '@/lib/uma-domain/race/run-race-sim';
import type {
  RaceSimWasmWorkerInMessage as RaceSimWorkerInMessage,
  RaceSimWasmWorkerOutMessage as RaceSimWorkerOutMessage,
  RaceSimWasmWorkerParams as RaceSimWorkerParams
} from '@/workers/race-sim-wasm.worker';
import { raceSimParamsToWasm } from '@/lib/uma-sim-wasm/adapter-params';
import { getUmaDisplayInfo } from '@/modules/runners/utils';

const createRaceSimWorker = () => new RaceSimWasmWorker();

function resolveRunnerName(runner: CreateRunner, index: number): string {
  const info = runner.outfitId ? getUmaDisplayInfo(runner.outfitId) : null;
  return info?.name ?? `Runner ${index + 1}`;
}

export type RaceSimRunnerOptions = {
  onResult?: (result: RaceSimResult) => void;
  onRunningChange?: (isRunning: boolean) => void;
};

export function useRaceSimRunner(options: RaceSimRunnerOptions = {}) {
  const { onResult, onRunningChange } = options;
  const workerRef = useRef<Worker | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRunning = useCallback(
    (running: boolean) => {
      setIsRunning(running);
      onRunningChange?.(running);
    },
    [onRunningChange]
  );

  const resetWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    const worker = createRaceSimWorker();
    worker.onmessage = (event: MessageEvent<RaceSimWorkerOutMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'race-sim-complete':
          onResult?.(message.data);
          setError(null);
          updateRunning(false);
          break;
        case 'race-sim-error':
          setError(message.error);
          updateRunning(false);
          break;
      }
    };

    worker.onerror = (event: ErrorEvent) => {
      setError(event.message || 'Race sim worker failed');
      updateRunning(false);
    };

    workerRef.current = worker;
  }, [onResult, updateRunning]);

  useEffect(() => {
    resetWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [resetWorker]);

  const runSimulation = useCallback(
    (params: RaceSimWorkerParams) => {
      if (!workerRef.current) {
        resetWorker();
      }

      const worker = workerRef.current;
      if (!worker) {
        setError('Race sim worker is unavailable');
        updateRunning(false);
        return;
      }

      setError(null);
      updateRunning(true);

      // Resolve skills/uma data into WASM params on the main thread; the worker
      // runs them without touching the dataset.
      const message: RaceSimWorkerInMessage = {
        type: 'race-sim-run',
        data: raceSimParamsToWasm(params, resolveRunnerName)
      };
      worker.postMessage(message);
    },
    [resetWorker, updateRunning]
  );

  const cancelSimulation = useCallback(() => {
    updateRunning(false);
    resetWorker();
  }, [resetWorker, updateRunning]);

  return {
    runSimulation,
    cancelSimulation,
    isRunning,
    error
  };
}
