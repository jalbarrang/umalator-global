import { useCallback, useEffect, useRef, useState } from 'react';
import RaceSimWasmWorker from '@workers/race-sim-wasm.worker.ts?worker';
import type { RaceSimResult } from 'sunday-tools/race-sim/run-race-sim';
import type {
  RaceSimWasmWorkerInMessage as RaceSimWorkerInMessage,
  RaceSimWasmWorkerOutMessage as RaceSimWorkerOutMessage,
  RaceSimWasmWorkerParams as RaceSimWorkerParams
} from '@/workers/race-sim-wasm.worker';

const createRaceSimWorker = () => new RaceSimWasmWorker();

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
