import {
  ChartTableEntry,
  setComparisonResults,
  stopChartTimer,
  updateTableData,
} from '@/store/simulation.store';
import { CompareResult } from '@/store/race/compare.types';
import { setIsSimulationRunning } from '@/store/ui.store';
import { useEffect, useRef } from 'react';

type WorkerMessage<T> = {
  type: 'compare' | 'chart' | 'compare-complete' | 'chart-complete';
  results: T;
};

/**
 * Creates a new worker instance with message handler attached
 */
function createWorker(handleMessage: (event: MessageEvent) => void): Worker {
  const worker = new Worker(new URL('@/simulator.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.addEventListener('message', handleMessage);
  return worker;
}

/**
 * Terminates a worker and cleans up its event listener
 */
function terminateWorker(
  worker: Worker | null,
  handleMessage: (event: MessageEvent) => void,
): void {
  if (worker) {
    worker.removeEventListener('message', handleMessage);
    worker.terminate();
  }
}

export const useSimulationWorkers = () => {
  const worker1Ref = useRef<Worker | null>(null);
  const worker2Ref = useRef<Worker | null>(null);
  const chartWorkersCompletedRef = useRef(0);

  const handleWorkerMessage = <T>(event: MessageEvent<WorkerMessage<T>>) => {
    const { type, results } = event.data;

    console.log('handleWorkerMessage', {
      type,
      results,
    });

    switch (type) {
      case 'compare':
        setComparisonResults(results as CompareResult);
        break;
      case 'chart':
        updateTableData(results as Map<string, ChartTableEntry>);
        break;
      case 'compare-complete':
        setIsSimulationRunning(false);
        break;
      case 'chart-complete':
        chartWorkersCompletedRef.current += 1;

        if (chartWorkersCompletedRef.current >= 2) {
          stopChartTimer();
          setIsSimulationRunning(false);
          chartWorkersCompletedRef.current = 0;
        }

        break;
    }
  };

  /**
   * Terminates existing workers and creates fresh ones.
   * Call this before starting a new chart run to prevent stale results
   * from accumulating with new data.
   */
  const resetWorkers = () => {
    // Terminate existing workers
    terminateWorker(worker1Ref.current, handleWorkerMessage);
    terminateWorker(worker2Ref.current, handleWorkerMessage);

    // Create fresh workers
    worker1Ref.current = createWorker(handleWorkerMessage);
    worker2Ref.current = createWorker(handleWorkerMessage);

    // Reset completion counter
    chartWorkersCompletedRef.current = 0;
  };

  useEffect(() => {
    worker1Ref.current = createWorker(handleWorkerMessage);

    return () => {
      terminateWorker(worker1Ref.current, handleWorkerMessage);
      worker1Ref.current = null;
    };
  }, []);

  useEffect(() => {
    worker2Ref.current = createWorker(handleWorkerMessage);

    return () => {
      terminateWorker(worker2Ref.current, handleWorkerMessage);
      worker2Ref.current = null;
    };
  }, []);

  return { worker1Ref, worker2Ref, chartWorkersCompletedRef, resetWorkers };
};
