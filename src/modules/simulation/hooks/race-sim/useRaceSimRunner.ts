import { useCallback, useEffect, useRef, useState } from 'react';
import RaceSimWorker from '@workers/race-sim.worker.ts?worker';
import RaceSimWasmWorker from '@workers/race-sim-wasm.worker.ts?worker';
import type { RaceSimResult } from 'sunday-tools/race-sim/run-race-sim';
import type {
  RaceSimWorkerInMessage,
  RaceSimWorkerOutMessage,
  RaceSimWorkerParams
} from '@/workers/race-sim.worker';

/** Which simulation engine the worker runs: the legacy TS sim or the Rust/WASM port. */
export type RaceSimEngine = 'ts' | 'wasm';

const createRaceSimWorker = (engine: RaceSimEngine) =>
  engine === 'wasm' ? new RaceSimWasmWorker() : new RaceSimWorker();

export type RaceSimRunnerOptions = {
  onResult?: (result: RaceSimResult) => void;
  onRunningChange?: (isRunning: boolean) => void;
  /** Engine to run the simulation with. Defaults to the legacy TS engine. */
  engine?: RaceSimEngine;
};

export function useRaceSimRunner(options: RaceSimRunnerOptions = {}) {
  const { onResult, onRunningChange, engine = 'ts' } = options;
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

    const worker = createRaceSimWorker(engine);
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
  }, [onResult, updateRunning, engine]);

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

      const message: RaceSimWorkerInMessage = {
        type: 'race-sim-run',
        data: params
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
