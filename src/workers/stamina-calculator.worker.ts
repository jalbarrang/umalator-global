/**
 * Web Worker for stamina calculator
 * Offloads calculation to prevent UI blocking
 */

import type { StaminaCalculatorInput } from '@/modules/stamina-calculator/types';
import { calculateStaminaResult } from '@/modules/stamina-calculator/lib/calculator';

self.addEventListener('message', (e: MessageEvent) => {
  const { msg, data } = e.data;

  switch (msg) {
    case 'calculate': {
      try {
        const input = data as StaminaCalculatorInput;
        const result = calculateStaminaResult(input);

        postMessage({
          type: 'result',
          result,
        });
      } catch (error) {
        postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : 'Calculation failed',
        });
      }
      break;
    }

    default:
      console.warn('Unknown message type:', msg);
  }
});
