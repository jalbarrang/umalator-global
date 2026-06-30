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
import { TicketsField } from '@/modules/carat/components/tickets-field';
import { RemovePlannedBannerButton } from '@/modules/carat/components/remove-planned-banner-button';
import {
  characterPickupCount,
  resolveBannerLabel,
  supportPickupCount
} from '@/modules/carat/data/card-names';
import { TargetGoals } from '@/modules/carat/components/target-goals';
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
  const freeAvail = row.freeBalanceAfter + row.freeCost;
  const paidAvail = row.paidBalanceAfter + row.paidCost;
  const totalAvail = freeAvail + paidAvail;

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
        <div className="grid gap-3 text-xs text-muted-foreground">
          <div className="grid gap-1">
            <span className="inline-flex items-center gap-1">
              Pulls
              <InfoHint label="Pulls and sparks help" title="Pulls and sparks">
                One pull costs 150 carats. One spark is 200 pulls and can be exchanged for a
                guaranteed pickup copy.
              </InfoHint>
            </span>
            <PullsField row={row} showCost />
          </div>
          <div className="grid gap-1">
            <span>Tickets</span>
            <TicketsField row={row} />
          </div>
        </div>
        <div className="grid content-start gap-2 text-right">
          <div className="text-xs text-muted-foreground">
            <div>Carats avail.</div>
            {showPaid ? (
              <div className="mt-0.5 grid gap-0.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[11px]">Total</span>
                  <span className="font-mono text-lg font-semibold text-foreground tabular-nums">
                    {formatCarats(totalAvail)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-4 text-[11px]">
                  <span>Paid</span>
                  <span className="font-mono tabular-nums">{formatCarats(paidAvail)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-4 text-[11px]">
                  <span>Free</span>
                  <span className="font-mono tabular-nums">{formatCarats(freeAvail)}</span>
                </div>
              </div>
            ) : (
              <div className="font-mono text-lg font-semibold text-foreground tabular-nums">
                {formatCarats(totalAvail)}
              </div>
            )}
          </div>
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
            pickupCount={supportPickupCount(row.event)}
            className="min-w-0"
          />
        )}
        <TargetGoals row={row} className="mt-2" />
      </div>
    </div>
  );
}
