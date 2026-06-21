import { formatCarats } from '@/modules/carat/components/banner-plan-format';
import type { BannerPlanRow } from '@/modules/carat/model/plan';
import { cn } from '@/lib/utils';

type BalanceVerdictProps = {
  row: BannerPlanRow;
  align?: 'left' | 'right';
};

function pullsNeededForShortfall(shortfall: number) {
  return Math.ceil(Math.max(0, shortfall) / 150);
}

export function BalanceVerdict(props: BalanceVerdictProps) {
  const { row, align = 'right' } = props;
  return (
    <div className={cn('font-mono tabular-nums', align === 'right' ? 'text-right' : 'text-left')}>
      <div className={cn('font-semibold', row.affordable ? 'text-primary' : 'text-destructive')}>
        {formatCarats(row.balanceAfter)}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {row.affordable
          ? 'Affordable ✓'
          : `Short by ${formatCarats(Math.abs(row.balanceAfter))} carats — add ~${pullsNeededForShortfall(Math.abs(row.balanceAfter)).toLocaleString()} pulls`}
      </div>
    </div>
  );
}
