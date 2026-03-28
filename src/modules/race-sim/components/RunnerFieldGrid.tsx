import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import { RunnerTile } from '@/modules/race-sim/components/RunnerTile';
import { toggleFocusRunner, useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';

type RunnerFieldGridProps = {
  className?: string;
  onOpenRunnerEditor?: (index: number) => void;
};

export function RunnerFieldGrid({ className, onOpenRunnerEditor }: RunnerFieldGridProps) {
  const { runners, focusRunnerIndices } = useRaceSimStore(
    useShallow((state) => ({
      runners: state.runners,
      focusRunnerIndices: state.focusRunnerIndices,
    })),
  );

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {runners.map((runner, index) => (
        <RunnerTile
          key={index}
          index={index}
          runner={runner}
          isFocused={focusRunnerIndices.includes(index)}
          onToggleFocus={toggleFocusRunner}
          onOpenEditor={onOpenRunnerEditor}
        />
      ))}
    </div>
  );
}
