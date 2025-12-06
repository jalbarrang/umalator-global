import { setRunType, useSimulationStore, RunType, clearSkillVisualization } from '@/store/simulation.store';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';

export const RunTypeSelector = () => {
  const { skillChart } = useSimulationStore();
  const currentRunType = skillChart?.currentRunType ?? 'meanrun';
  const selectedSkillsCount = skillChart?.selectedSkillsForVisualization?.size ?? 0;

  const handleSetRunType = (value: string) => {
    if (!value) return;
    setRunType(value as RunType);
  };

  const handleClearSelection = () => {
    clearSkillVisualization();
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          Show run:
        </span>
        <ToggleGroup
          type="single"
          value={currentRunType}
          onValueChange={handleSetRunType}
          className="bg-muted rounded-md p-0.5"
        >
          <ToggleGroupItem
            value="minrun"
            className="px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            Min
          </ToggleGroupItem>
          <ToggleGroupItem
            value="maxrun"
            className="px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            Max
          </ToggleGroupItem>
          <ToggleGroupItem
            value="meanrun"
            className="px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            Mean
          </ToggleGroupItem>
          <ToggleGroupItem
            value="medianrun"
            className="px-3 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          >
            Median
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2">
        {selectedSkillsCount > 0 && (
          <>
            <Badge variant="secondary" className="font-normal">
              {selectedSkillsCount} skill{selectedSkillsCount !== 1 ? 's' : ''} selected
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSelection}
              className="h-7"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

