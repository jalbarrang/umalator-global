import { useCallback, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRaceSimContext } from '@/modules/race-sim/context';
import { RunnerListItem } from '@/modules/race-sim/components/RunnerListItem';
import { RunnerDetailPanel } from '@/modules/race-sim/components/RunnerDetailPanel';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { RaceSimActionBar } from '@/modules/race-sim/components/RaceSimActionBar';
import { toggleFocusRunner, useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';

export function RaceSimHome() {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const { runWithSeed, cancelSimulation, isRunning } = useRaceSimContext();

  const { runners, focusRunnerIndices } = useRaceSimStore(
    useShallow((state) => ({
      runners: state.runners,
      focusRunnerIndices: state.focusRunnerIndices,
    })),
  );

  const handleSelectRunner = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="shrink-0 border-b">
        <RaceSettingsPanel open />
        <div className="px-4 py-2 border-t">
          <RaceSimActionBar
            isRunning={isRunning}
            onRun={runWithSeed}
            onCancel={cancelSimulation}
            onReplay={runWithSeed}
          />
        </div>
      </div>

      <div className={cn('relative flex flex-1 min-h-0', isRunning && 'pointer-events-none')}>
        <aside className="flex w-[400px] shrink-0 flex-col border-r bg-background min-h-0">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Users className="size-3.5 text-muted-foreground" />

            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Field ({runners.length})
            </span>
          </div>

          <div className="flex flex-col flex-1 p-2 overflow-y-auto">
            {runners.map((runner, index) => (
              <RunnerListItem
                key={runner.randomMobId}
                index={index}
                runner={runner}
                isSelected={selectedIndex === index}
                isFocused={focusRunnerIndices.includes(index)}
                onSelect={handleSelectRunner}
                onToggleFocus={toggleFocusRunner}
              />
            ))}
          </div>
        </aside>

        <main className="flex flex-1 flex-col min-h-0 min-w-0 bg-background">
          <RunnerDetailPanel
            runnerIndex={selectedIndex}
            totalRunners={runners.length}
            onNavigate={handleSelectRunner}
          />
        </main>

        {isRunning && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-background/50 backdrop-blur-[2px]">
            <div className="flex items-center gap-2.5 rounded-lg border bg-card px-4 py-2.5 text-sm shadow-md">
              <Loader2 className="size-4 animate-spin text-primary" />
              Running race simulation...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
