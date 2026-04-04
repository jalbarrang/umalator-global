import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '@/components/ui/button';
import { useRaceSimContext } from '@/modules/race-sim/context';
import { RaceResultsSummary } from '@/modules/race-sim/components/RaceResultsSummary';
import { FocusRunnerDetailPanel } from '@/modules/race-sim/components/FocusRunnerDetailPanel';
import { useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';

export function RaceSimResults() {
  const { runWithSeed, isRunning } = useRaceSimContext();

  const { focusRunnerIndices, results, isStale } = useRaceSimStore(
    useShallow((state) => ({
      focusRunnerIndices: state.focusRunnerIndices,
      results: state.results,
      isStale: state.isStale,
    })),
  );

  const focusRunnerIndex = useMemo(() => {
    if (focusRunnerIndices.length === 0) return null;
    return [...focusRunnerIndices].sort((a, b) => a - b)[0] ?? null;
  }, [focusRunnerIndices]);

  const hasFocusData = useMemo(() => {
    if (focusRunnerIndex === null || !results?.collectedData) return false;
    return results.collectedData.rounds.some(
      (round) => round.focusRunnerData[focusRunnerIndex] !== undefined,
    );
  }, [focusRunnerIndex, results]);

  const handleRerun = useCallback(() => {
    const seed = useRaceSimStore.getState().seed;
    if (seed === null) return;
    runWithSeed(seed);
  }, [runWithSeed]);

  if (!results) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">
          No results yet. Head to the Run tab to start a simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-w-0 gap-3 p-4">
      {isStale && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          <span className="text-amber-700 dark:text-amber-300">
            Configuration changed since the last run.
          </span>
          <Button size="sm" variant="outline" onClick={handleRerun} disabled={isRunning}>
            Re-run
          </Button>
        </div>
      )}

      <RaceResultsSummary />

      {focusRunnerIndex !== null && hasFocusData && (
        <FocusRunnerDetailPanel runnerIndex={focusRunnerIndex} />
      )}
    </div>
  );
}
