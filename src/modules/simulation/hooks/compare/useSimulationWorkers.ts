import { CompareResult } from '@/store/race/compare.types';
import { setResults } from '@/store/race/store';
import { setIsSimulationRunning } from '@/store/ui.store';
import { useEffect, useRef } from 'react';

type WorkerMessage<T> = {
  type: 'compare' | 'compare-complete';
  results: T;
};

export const useSimulationWorkers = () => {
  const webWorkerRef = useRef<Worker | null>(null);

  const handleWorkerMessage = <T>(event: MessageEvent<WorkerMessage<T>>) => {
    const { type, results } = event.data;

    console.log('compare:handleWorkerMessage', {
      type,
      results,
    });

    switch (type) {
      case 'compare':
        setResults(results as CompareResult);
        break;
      case 'compare-complete':
        setIsSimulationRunning(false);
        break;
    }
  };

  useEffect(() => {
    const webWorker = new Worker(
      new URL('@/workers/simulator.worker.ts', import.meta.url),
      { type: 'module' },
    );

    webWorker.addEventListener('message', handleWorkerMessage);

    webWorkerRef.current = webWorker;
    return () => {
      webWorker.removeEventListener('message', handleWorkerMessage);
      webWorker.terminate();
      webWorkerRef.current = null;
    };
  }, []);

  return { worker1Ref: webWorkerRef };
};
