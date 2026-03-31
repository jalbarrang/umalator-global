import { createContext, useContext } from 'react';

export type RaceSimContextValue = {
  runWithSeed: (seed: number) => void;
  cancelSimulation: () => void;
  isRunning: boolean;
  error: string | null;
};

export const RaceSimContext = createContext<RaceSimContextValue | null>(null);

export function useRaceSimContext(): RaceSimContextValue {
  const ctx = useContext(RaceSimContext);

  if (!ctx) {
    throw new Error('useRaceSimContext must be used within the RaceSimRoot layout');
  }

  return ctx;
}
