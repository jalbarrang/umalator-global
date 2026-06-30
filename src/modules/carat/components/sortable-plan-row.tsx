import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BalanceVerdict } from '@/modules/carat/components/balance-verdict';
import { BannerIdentity } from '@/modules/carat/components/banner-identity';
import { formatCarats } from '@/modules/carat/components/banner-plan-format';
import { CopiesOddsBar } from '@/modules/carat/components/copies-odds-bar';
import { UmaOddsBar } from '@/modules/carat/components/uma-odds-bar';
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

type SortablePlanRowProps = {
  row: BannerPlanRow;
  showPaid: boolean;
};

export function SortablePlanRow(props: SortablePlanRowProps) {
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
    <tr
      ref={setNodeRef}
      style={style}
      className={cn('border-b align-middle', isDragging && 'relative z-10 bg-accent shadow-md')}
    >
      <td className="w-10 px-2 py-3">
        <PlanDragHandle attributes={attributes} listeners={listeners} />
      </td>
      <td className="min-w-[220px] px-2 py-3">
        <BannerIdentity row={row} showWindow />
      </td>
      <td className="px-2 py-3 text-right tabular-nums">
        {showPaid ? (
          <div className="ml-auto grid w-fit gap-0.5">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[11px] text-muted-foreground">Total</span>
              <span className="font-mono text-base font-semibold text-foreground">
                {formatCarats(totalAvail)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-[11px] text-muted-foreground">
              <span>Paid</span>
              <span className="font-mono">{formatCarats(paidAvail)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-[11px] text-muted-foreground">
              <span>Free</span>
              <span className="font-mono">{formatCarats(freeAvail)}</span>
            </div>
          </div>
        ) : (
          <div className="font-mono text-base font-semibold text-foreground">
            {formatCarats(totalAvail)}
          </div>
        )}
      </td>
      <td className="w-44 min-w-44 px-2 py-3">
        <PullsField row={row} showCost density="table" />
      </td>
      <td className="w-44 min-w-44 px-2 py-3">
        <TicketsField row={row} density="table" />
      </td>
      <td data-tutorial="carat-balance" className="px-2 py-3">
        <BalanceVerdict row={row} />
      </td>
      <td data-tutorial="carat-odds" className="px-2 py-3 text-left">
        {row.event.card_type === 'character' ? (
          <UmaOddsBar pickupCount={characterPickupCount(row.event)} />
        ) : (
          <CopiesOddsBar
            pulls={row.plannedBanner.plannedPulls}
            startingDupes={row.plannedBanner.startingDupes}
            pickupCount={supportPickupCount(row.event)}
          />
        )}
        <TargetGoals row={row} className="mt-2" />
      </td>
      <td className="w-10 px-2 py-3 text-right">
        <RemovePlannedBannerButton bannerId={row.event.id} bannerLabel={bannerLabel} />
      </td>
    </tr>
  );
}
