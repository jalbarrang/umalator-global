import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BalanceVerdict } from '@/modules/carat/components/balance-verdict';
import { BannerIdentity } from '@/modules/carat/components/banner-identity';
import { formatCarats } from '@/modules/carat/components/banner-plan-format';
import { CopiesOddsBar } from '@/modules/carat/components/copies-odds-bar';
import { UmaOddsBar } from '@/modules/carat/components/uma-odds-bar';
import { InfoHint } from '@/modules/carat/components/info-hint';
import { PlanDragHandle } from '@/modules/carat/components/plan-drag-handle';
import { PullsField } from '@/modules/carat/components/pulls-field';
import { RemovePlannedBannerButton } from '@/modules/carat/components/remove-planned-banner-button';
import { characterPickupCount, resolveBannerLabel } from '@/modules/carat/data/card-names';
import type { BannerPlanRow } from '@/modules/carat/model/plan';
import { cn } from '@/lib/utils';

type SortablePlanCardProps = {
  row: BannerPlanRow;
  showPaid: boolean;
};

export function SortablePlanCard(props: SortablePlanCardProps) {
  const { row, showPaid } = props;
  const bannerLabel = resolveBannerLabel(row.event);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.event.id
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border bg-card p-3 shadow-sm',
        isDragging && 'relative z-10 shadow-md'
      )}
    >
      <div className="flex items-start gap-2">
        <PlanDragHandle attributes={attributes} listeners={listeners} className="mt-1" />
        <div className="min-w-0 flex-1">
          <BannerIdentity row={row} showWindow />
        </div>
        <RemovePlannedBannerButton bannerId={row.event.id} bannerLabel={bannerLabel} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="grid gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Pulls
            <InfoHint label="Pulls and sparks help" title="Pulls and sparks">
              One pull costs 150 carats. One spark is 200 pulls and can be exchanged for a
              guaranteed pickup copy.
            </InfoHint>
          </span>
          <PullsField row={row} showCost />
        </div>
        <div className="grid content-start gap-2 text-right">
          <div className="text-xs text-muted-foreground">
            Carats avail.{' '}
            <span className="font-medium font-mono text-foreground tabular-nums">
              {formatCarats(row.caratsAvailable)}
            </span>
          </div>
          {showPaid && (row.paidCaratsAvailable > 0 || row.paidBalanceAfter > 0) ? (
            <div className="text-xs text-muted-foreground">
              Paid pool{' '}
              <span className="font-medium font-mono text-foreground tabular-nums">
                {formatCarats(row.paidCaratsAvailable)}
              </span>
            </div>
          ) : null}
          <div className="mt-1 rounded-lg border bg-muted/40 p-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
              Balance
            </div>
            <BalanceVerdict row={row} />
          </div>
        </div>
      </div>

      <div className="mt-3">
        {row.event.card_type === 'character' ? (
          <UmaOddsBar pickupCount={characterPickupCount(row.event)} className="min-w-0" />
        ) : (
          <CopiesOddsBar
            pulls={row.plannedBanner.plannedPulls}
            startingDupes={row.plannedBanner.startingDupes}
            className="min-w-0"
          />
        )}
      </div>
    </div>
  );
}
