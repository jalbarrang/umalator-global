import { updateTable } from '@/modules/simulation/stores/uma-bassin.store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { useEffect, useRef } from 'react';
import { RoundResult } from '../../types';

type WorkerMessage<T> = {
  type: 'uma-bassin' | 'uma-bassin-done';
  results: T;
};

export const useUmaBassinWorkers = () => {
  const worker1Ref = useRef<Worker | null>(null);
  const worker2Ref = useRef<Worker | null>(null);

  const chartWorkersCompletedRef = useRef(0);

  const handleWorkerMessage = (
    event: MessageEvent<WorkerMessage<Map<string, RoundResult>>>,
  ) => {
    const { type, results } = event.data;

    console.log('uma-bassin:handleWorkerMessage', {
      type,
      results,
    });

    switch (type) {
      case 'uma-bassin':
        updateTable(Object.fromEntries(results));
        break;
      case 'uma-bassin-done':
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
      new URL('@/workers/uma-bassin.worker.ts', import.meta.url),
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
      new URL('@/workers/uma-bassin.worker.ts', import.meta.url),
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
