import { setIsSimulationRunning } from '@/store/ui.store';
import { useEffect, useRef } from 'react';
import { RoundResult } from '../../types';
import { updateTable } from '../../stores/skills-bassin.store';

type WorkerMessage<T> = {
  type: 'skill-bassin' | 'skill-bassin-done';
  results: T;
};

export const useSkillBassinWorkers = () => {
  const worker1Ref = useRef<Worker | null>(null);
  const worker2Ref = useRef<Worker | null>(null);

  const chartWorkersCompletedRef = useRef(0);

  const handleWorkerMessage = (
    event: MessageEvent<WorkerMessage<Map<string, RoundResult>>>,
  ) => {
    const { type, results } = event.data;

    console.log('skill-bassin:handleWorkerMessage', {
      type,
      results,
    });

    switch (type) {
      case 'skill-bassin':
        updateTable(Object.fromEntries(results));
        break;
      case 'skill-bassin-done':
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
      new URL('@/workers/skill-bassin.worker.ts', import.meta.url),
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
      new URL('@/workers/skill-bassin.worker.ts', import.meta.url),
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
