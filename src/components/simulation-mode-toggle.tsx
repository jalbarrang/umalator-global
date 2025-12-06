import { setMode, useUIStore } from '@/store/ui.store';
import { switchToMode } from '@/store/simulation.store';
import { Mode } from '@/utils/settings';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

export const SimulationModeToggle = () => {
  const { mode } = useUIStore();

  const handleSetMode = (value: string) => {
    const newMode = parseInt(value) as Mode;
    setMode(newMode);
    switchToMode(newMode);
  };

  return (
    <ToggleGroup
      type="single"
      value={mode.toString()}
      size="lg"
      onValueChange={handleSetMode}
      className="bg-muted rounded-md p-0.5"
    >
      <ToggleGroupItem
        value={Mode.Compare.toString()}
        className="px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Compare
      </ToggleGroupItem>
      <ToggleGroupItem
        value={Mode.Chart.toString()}
        className="px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Skill chart
      </ToggleGroupItem>
      <ToggleGroupItem
        value={Mode.UniquesChart.toString()}
        className="px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Uma chart
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
