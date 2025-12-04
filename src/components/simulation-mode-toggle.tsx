import { setMode, useUIStore } from '@/store/ui.store';
import { Mode } from '@/utils/settings';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

export const SimulationModeToggle = () => {
  const { mode } = useUIStore();

  return (
    <ToggleGroup
      type="single"
      value={mode.toString()}
      size="lg"
      onValueChange={(value) => {
        if (value) setMode(parseInt(value));
      }}
      className="bg-muted rounded-md p-0.5"
    >
      <ToggleGroupItem
        value={Mode.Compare.toString()}
        className="text-sm px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Compare
      </ToggleGroupItem>
      <ToggleGroupItem
        value={Mode.Chart.toString()}
        className="text-sm px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Skill chart
      </ToggleGroupItem>
      <ToggleGroupItem
        value={Mode.UniquesChart.toString()}
        className="text-sm px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Uma chart
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
