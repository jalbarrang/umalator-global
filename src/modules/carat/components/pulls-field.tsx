import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Input } from '@/components/ui/input';
import { formatCarats } from '@/modules/carat/components/banner-plan-format';
import { resolveBannerLabel } from '@/modules/carat/data/card-names';
import type { BannerPlanRow } from '@/modules/carat/model/plan';
import { setPlannedPulls } from '@/store/carat.store';
import { cn } from '@/lib/utils';

type PullsFieldProps = {
  row: BannerPlanRow;
  showCost?: boolean;
  density?: 'table' | 'card';
};

function usePullControls(row: BannerPlanRow) {
  const updatePulls = (value: number) => setPlannedPulls(row.event.id, Math.max(0, Math.floor(value || 0)));
  return { updatePulls };
}

export function PullsField(props: PullsFieldProps) {
  const { row, showCost, density = 'card' } = props;
  const { updatePulls } = usePullControls(row);
  const costLine = showCost ? (
    <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
      Cost {formatCarats(row.cost)}
      {row.paidCost > 0 ? ` · paid ${formatCarats(row.paidCost)}` : ''}
    </div>
  ) : null;

  return (
    <div className={cn('grid', density === 'table' ? 'gap-1.5' : 'gap-1')}>
      <Input
        data-tutorial="carat-pulls-input"
        type="number"
        min={0}
        value={row.plannedBanner.plannedPulls}
        onChange={(event) => updatePulls(Number(event.target.value))}
        className="font-mono text-right tabular-nums"
        aria-label={`Planned pulls for ${resolveBannerLabel(row.event)}`}
      />
      {density === 'table' ? (
        <ButtonGroup className="w-full *:data-[slot=button]:min-w-0 *:data-[slot=button]:flex-1 *:data-[slot=button]:px-1">
          <Button size="xs" variant="outline" onClick={() => updatePulls(0)}>
            0
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => updatePulls(row.plannedBanner.plannedPulls - 200)}
          >
            -200
          </Button>
          <Button
            size="xs"
            variant="outline"
            onClick={() => updatePulls(row.plannedBanner.plannedPulls + 200)}
          >
            +200
          </Button>
        </ButtonGroup>
      ) : (
        <div className="flex flex-wrap gap-1">
          <Button size="xs" variant="outline" onClick={() => updatePulls(0)}>
            0
          </Button>
          <Button size="xs" variant="outline" onClick={() => updatePulls(row.plannedBanner.plannedPulls - 200)}>
            -200
          </Button>
          <Button size="xs" variant="outline" onClick={() => updatePulls(row.plannedBanner.plannedPulls + 200)}>
            +200
          </Button>
        </div>
      )}
      {costLine}
    </div>
  );
}
