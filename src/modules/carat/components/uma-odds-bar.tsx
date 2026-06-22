import { PITY_PULLS, umaOutcomeOdds } from '@/modules/carat/model/odds';
import { cn } from '@/lib/utils';

export type UmaOddsBarProps = {
  pickupCount?: number;
  className?: string;
};

function formatPercent(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits }).format(
    value
  );
}

export function UmaOddsBar(props: UmaOddsBarProps) {
  const { pickupCount = 1, className } = props;

  const chance = umaOutcomeOdds(pickupCount).rateUp;
  const target = pickupCount > 1 ? `any one of ${pickupCount} rate-up Umas` : 'the rate-up Uma';

  return (
    <p className={cn('min-w-[180px] text-xs leading-snug text-muted-foreground', className)}>
      <span className="font-mono font-semibold text-foreground tabular-nums">
        {formatPercent(chance)}
      </span>{' '}
      chance to get {target} from luck before the {PITY_PULLS}-pull spark.
    </p>
  );
}
