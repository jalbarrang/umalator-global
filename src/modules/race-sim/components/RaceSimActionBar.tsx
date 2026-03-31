import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimulationControlBar } from '@/components/simulation-control-bar';
import {
  clearResults,
  createNewSeed,
  setNsamples,
  setSeed,
  useRaceSimStore,
} from '@/modules/simulation/stores/race-sim.store';

type RaceSimActionBarProps = {
  isRunning: boolean;
  onRun: (seed: number) => void;
  onCancel: () => void;
  onReplay: (seed: number) => void;
};

export function RaceSimActionBar({ isRunning, onRun, onCancel, onReplay }: RaceSimActionBarProps) {
  const { seed, nsamples, results } = useRaceSimStore(
    useShallow((state) => ({
      seed: state.seed,
      nsamples: state.nsamples,
      results: state.results,
    })),
  );

  const [sampleInput, setSampleInput] = useState(() => nsamples.toString());

  useEffect(() => {
    setSampleInput(nsamples.toString());
  }, [nsamples]);

  const handleNsamplesBlur = () => {
    const parsed = Number(sampleInput);
    if (!Number.isFinite(parsed)) {
      setSampleInput(nsamples.toString());
      return;
    }

    setNsamples(parsed);
  };

  const clearDisabled = useMemo(() => results === null, [results]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SimulationControlBar
        isRunning={isRunning}
        seed={seed}
        onRun={onRun}
        onCancel={onCancel}
        onReplay={onReplay}
        onClear={clearResults}
        clearDisabled={clearDisabled || isRunning}
        createSeed={createNewSeed}
        setSeed={setSeed}
        runLabel="Run Race Simulation"
      />

      <div className="flex items-center gap-2">
        <Label htmlFor="race-sim-nsamples" className="text-sm text-muted-foreground">
          Samples:
        </Label>
        <Input
          id="race-sim-nsamples"
          type="number"
          min={1}
          max={10}
          value={sampleInput}
          onChange={(event) => setSampleInput(event.target.value)}
          onBlur={handleNsamplesBlur}
          className="w-20 text-sm"
          disabled={isRunning}
        />
      </div>
    </div>
  );
}
