import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCarats } from '@/modules/carat/components/banner-plan-format';
import { resolveBannerLabel } from '@/modules/carat/data/card-names';
import type { BannerPlanRow } from '@/modules/carat/model/plan';
import { setPlannedTicketsUsed } from '@/store/carat.store';
import { cn } from '@/lib/utils';

type TicketsFieldProps = {
  row: BannerPlanRow;
  density?: 'table' | 'card';
};

function ticketLabel(row: BannerPlanRow) {
  return row.ticketType === 'uma' ? 'Uma' : 'Support';
}

function maxTicketsForRow(row: BannerPlanRow) {
  return Math.min(
    row.ticketsAvailable,
    Math.max(0, Math.floor(row.plannedBanner.plannedPulls || 0))
  );
}

export function TicketsField(props: TicketsFieldProps) {
  const { row, density = 'card' } = props;
  const isAuto = row.plannedBanner.ticketsUsed === undefined;
  const maxTickets = maxTicketsForRow(row);
  const label = ticketLabel(row);
  const updateTickets = (value: number) =>
    setPlannedTicketsUsed(row.event.id, Math.min(maxTickets, Math.max(0, value || 0)));
  const resetToAuto = () => setPlannedTicketsUsed(row.event.id, undefined);

  return (
    <div className={cn('grid', density === 'table' ? 'gap-1.5' : 'gap-1')}>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={maxTickets}
          value={row.ticketsUsed}
          onChange={(event) => updateTickets(Number(event.target.value))}
          className="w-16 font-mono text-right tabular-nums"
          aria-label={`${label} tickets to use on ${resolveBannerLabel(row.event)}`}
        />
        <span className="min-w-fit text-xs text-muted-foreground">/ {maxTickets}</span>
      </div>
      <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
        {row.ticketsSaved > 0 ? `Saves ${formatCarats(row.ticketsSaved)} · ` : ''}
        {row.ticketsRemaining.toLocaleString()} tickets left
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>{isAuto ? 'Auto-filling earliest banner' : 'Manual ticket allocation'}</span>
        {!isAuto ? (
          <Button
            type="button"
            size="xs"
            variant="link"
            className="h-auto px-0"
            onClick={resetToAuto}
          >
            reset auto
          </Button>
        ) : null}
      </div>
    </div>
  );
}
