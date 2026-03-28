import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRaceSimContext } from '@/modules/race-sim/context';
import { RunnerFieldGrid } from '@/modules/race-sim/components/RunnerFieldGrid';
import { RunnerTileEditor } from '@/modules/race-sim/components/RunnerTileEditor';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { RaceSimActionBar } from '@/modules/race-sim/components/RaceSimActionBar';
import { Separator } from '@/components/ui/separator';

export function RaceSimHome() {
  const [editorRunnerIndex, setEditorRunnerIndex] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const { runWithSeed, cancelSimulation, isRunning } = useRaceSimContext();

  const handleOpenRunnerEditor = useCallback((index: number) => {
    setEditorRunnerIndex(index);
    setIsEditorOpen(true);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-w-0 gap-4 p-4">
      <RaceSettingsPanel open />
      <RaceSimActionBar
        isRunning={isRunning}
        onRun={runWithSeed}
        onCancel={cancelSimulation}
        onReplay={runWithSeed}
      />

      <Separator />

      <div className={cn('relative', isRunning && 'pointer-events-none opacity-70')}>
        <RunnerFieldGrid onOpenRunnerEditor={isRunning ? undefined : handleOpenRunnerEditor} />

        {isRunning && (
          <div className="absolute inset-0 grid place-items-center rounded-lg bg-background/35">
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
              <Loader2 className="size-4 animate-spin text-primary" />
              Running race simulation...
            </div>
          </div>
        )}
      </div>

      <RunnerTileEditor
        open={isEditorOpen}
        runnerIndex={editorRunnerIndex}
        onOpenChange={setIsEditorOpen}
      />
    </div>
  );
}
