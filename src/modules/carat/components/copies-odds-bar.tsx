import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { copiesOdds, PITY_PULLS, type CopiesOdds } from '@/modules/carat/model/odds';
import { cn } from '@/lib/utils';

export type CopiesOddsBarProps = {
  pulls: number;
  startingDupes?: number;
  odds?: CopiesOdds;
  className?: string;
};

type OddsSegment = {
  key: keyof CopiesOdds;
  label: string;
  className: string;
};

const SEGMENTS: OddsSegment[] = [
  { key: 'mlb', label: 'MLB', className: 'bg-primary' },
  { key: 'lb3', label: 'LB3', className: 'bg-emerald-500 dark:bg-emerald-400' },
  { key: 'lb2', label: 'LB2', className: 'bg-sky-500 dark:bg-sky-400' },
  { key: 'lb1', label: 'LB1', className: 'bg-violet-500 dark:bg-violet-400' },
  { key: 'lb0', label: 'LB0', className: 'bg-amber-500 dark:bg-amber-400' },
  { key: 'none', label: 'None', className: 'bg-muted-foreground/30' }
];

function formatPercent(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits }).format(value);
}

export function CopiesOddsBar(props: CopiesOddsBarProps) {
  const { pulls, startingDupes = 0, odds = copiesOdds({ pulls, startingDupes }), className } = props;
  const atLeastOne = 1 - odds.none;
  const sparkReached = pulls >= PITY_PULLS;

  return (
    <div className={cn('min-w-[180px] space-y-1.5', className)}>
      <div className="text-xs font-medium tabular-nums">
        MLB {formatPercent(odds.mlb)} · ≥1 copy {formatPercent(atLeastOne)}
      </div>
      <div className="hidden h-3 overflow-hidden rounded-full border bg-muted sm:flex" aria-label={`MLB ${formatPercent(odds.mlb, 1)}, at least one copy ${formatPercent(atLeastOne, 1)}`}>
        {SEGMENTS.map((segment) => {
          const value = odds[segment.key];
          if (value <= 0) return null;
          return (
            <Tooltip key={segment.key}>
              <TooltipTrigger render={<div className={cn('h-full min-w-0', segment.className)} style={{ width: `${value * 100}%` }} />} />
              <TooltipContent>{segment.label}: {formatPercent(value, 1)}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {sparkReached ? 'Spark reached' : `${Math.max(0, PITY_PULLS - pulls)} pulls to spark`}
      </div>
    </div>
  );
}
