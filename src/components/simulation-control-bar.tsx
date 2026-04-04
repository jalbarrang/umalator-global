import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HelpButton } from '@/components/ui/help-button';
import { parseSeed } from '@/utils/crypto';
import type { TutorialId, TutorialStep } from '@/components/tutorial/types';

type SimulationControlBarProps = {
  isRunning: boolean;
  seed: number | null;
  onRun: (seed: number) => void;
  onCancel: () => void;
  onReplay: (seed: number) => void;
  onClear: () => void;
  clearDisabled: boolean;
  createSeed: () => number;
  setSeed: (seed: number) => void;
  runLabel?: string;
  tutorial?: {
    id: TutorialId;
    steps: TutorialStep[];
    tooltip: string;
  };
  dataTutorial?: string;
};

export function SimulationControlBar(props: SimulationControlBarProps) {
  const {
    isRunning,
    seed,
    onRun,
    onCancel,
    onReplay,
    onClear,
    clearDisabled,
    createSeed,
    setSeed: setStoreSeed,
    runLabel = 'Run Skill Simulations',
    tutorial,
    dataTutorial,
  } = props;

  const [seedInput, setSeedInput] = useState<string>(() => {
    if (seed === null) return '';
    return seed.toString();
  });

  const handleSeedInputBlur = useCallback(() => {
    const parsed = parseSeed(seedInput);
    if (parsed === null) return;
    setStoreSeed(parsed);
  }, [seedInput, setStoreSeed]);

  const handleRun = () => {
    const newSeed = createSeed();
    setSeedInput(newSeed.toString());
    onRun(newSeed);
  };

  const handleReplay = () => {
    if (seed === null) return;
    onReplay(seed);
  };

  return (
    <div data-tutorial={dataTutorial} className="flex flex-wrap items-center gap-2">
      {!isRunning ? (
        <Button variant="default" onClick={handleRun}>
          {runLabel}
        </Button>
      ) : (
        <Button variant="destructive" onClick={onCancel}>
          Cancel Simulation
        </Button>
      )}

      {tutorial && (
        <HelpButton
          tutorialId={tutorial.id}
          steps={tutorial.steps}
          tooltipText={tutorial.tooltip}
        />
      )}

      <div className="flex items-center gap-2">
        <Label htmlFor="seed-input" className="text-sm text-muted-foreground">
          Seed:
        </Label>
        <Input
          id="seed-input"
          type="number"
          value={seedInput}
          onChange={(e) => setSeedInput(e.target.value)}
          onBlur={handleSeedInputBlur}
          placeholder="Run to generate"
          className="w-40 text-sm"
          disabled={isRunning}
        />
        <Button
          variant="outline"
          onClick={handleReplay}
          disabled={isRunning || seedInput.trim() === ''}
        >
          Replay
        </Button>
      </div>

      <Button variant="outline" onClick={onClear} disabled={clearDisabled}>
        Clear
      </Button>
    </div>
  );
}
