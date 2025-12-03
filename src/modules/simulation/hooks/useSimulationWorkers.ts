import { ChartTableEntry, updateTableData } from '@/store/chart.store';
import { CompareResult } from '@/store/race/compare.types';
import { setResults } from '@/store/race/store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { useEffect, useRef } from 'react';

type WorkerMessage<T> = {
  type: 'compare' | 'chart' | 'compare-complete' | 'chart-complete';
  results: T;
};

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
        setResults(results as CompareResult);
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
          setIsSimulationRunning(false);
          chartWorkersCompletedRef.current = 0;
        }

        break;
    }
  };

  useEffect(() => {
    const webWorker = new Worker(
      new URL('@/simulator.worker.ts', import.meta.url),
      { type: 'module' },
    );

    webWorker.addEventListener('message', handleWorkerMessage);

    worker1Ref.current = webWorker;
    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
      worker1Ref.current = null;
    };
  }, []);

  useEffect(() => {
    const webWorker = new Worker(
      new URL('@/simulator.worker.ts', import.meta.url),
      { type: 'module' },
    );

    webWorker.addEventListener('message', handleWorkerMessage);
    worker2Ref.current = webWorker;

    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
      worker2Ref.current = null;
    };
  }, []);

  return { worker1Ref, worker2Ref, chartWorkersCompletedRef };
};
