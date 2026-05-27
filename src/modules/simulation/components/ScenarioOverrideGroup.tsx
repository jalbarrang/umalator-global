import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RegionRow = {
  start: number;
  end: number;
  rank?: number;
};

type ScenarioOverrideGroupProps = {
  title: string;
  regions: Array<RegionRow>;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdateStart: (index: number, value: number) => void;
  onUpdateEnd: (index: number, value: number) => void;
  onUpdateRank?: (index: number, value: number) => void;
  showRank?: boolean;
};

export function ScenarioOverrideGroup(props: ScenarioOverrideGroupProps) {
  const { title, regions, onAdd, onRemove, onUpdateStart, onUpdateEnd, onUpdateRank, showRank } =
    props;

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Label>

      {regions.length === 0 && (
        <div className="text-xs text-muted-foreground">No overrides set.</div>
      )}

      {regions.map((region, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={10}
            placeholder="Start"
            value={region.start}
            className="w-20"
            onChange={(e) => onUpdateStart(index, Math.round(Number(e.currentTarget.value)))}
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="number"
            min={0}
            step={10}
            placeholder="End"
            value={region.end}
            className="w-20"
            onChange={(e) => onUpdateEnd(index, Math.round(Number(e.currentTarget.value)))}
          />
          {showRank && onUpdateRank && (
            <>
              <span className="text-xs text-muted-foreground">Rank</span>
              <Input
                type="number"
                min={1}
                max={9}
                step={1}
                value={region.rank ?? 1}
                className="w-16"
                onChange={(e) => {
                  const val = Math.min(9, Math.max(1, Math.round(Number(e.currentTarget.value))));
                  onUpdateRank(index, val);
                }}
              />
            </>
          )}
          <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => onRemove(index)}>
            <X className="size-3" />
          </Button>
        </div>
      ))}

      <Button variant="outline" size="sm" className="self-start" onClick={onAdd}>
        <Plus className="size-3 mr-1" />
        Add
      </Button>
    </div>
  );
}
