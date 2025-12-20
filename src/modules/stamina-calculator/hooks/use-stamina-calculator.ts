import { useEffect, useRef } from 'react';
import StaminaCalculatorWorker from '@workers/stamina-calculator.worker.ts?worker';
import { useStaminaCalculatorStore } from '../store/stamina-calculator.store';
import type { StaminaCalculationResult } from '../types';


/**
 * Hook to manage stamina calculator worker communication
 */
export function useStaminaCalculator() {
  const workerRef = useRef<Worker | null>(null);
  const { input, setResult, setError, isCalculating } =
    useStaminaCalculatorStore();

  // Initialize worker
  useEffect(() => {
    workerRef.current = new StaminaCalculatorWorker();

    // Set up message handler
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { type, result, error } = e.data;

      if (type === 'result') {
        setResult(result as StaminaCalculationResult);
      } else if (type === 'error') {
        setError(error as string);
      }
    };

    // Set up error handler
    workerRef.current.onerror = (error) => {
      console.error('Worker error:', error);
      setError('Worker error: ' + error.message);
    };

    // Cleanup
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [setResult, setError]);

  // Trigger calculation when input changes
  useEffect(() => {
    if (!workerRef.current || !isCalculating) return;

    workerRef.current.postMessage({
      msg: 'calculate',
      data: input,
    });
  }, [input, isCalculating]);

  return {
    isCalculating,
  };
}
