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
      <td className="px-2 py-3 text-right font-mono tabular-nums">
        <div className="text-base font-semibold text-foreground">{formatCarats(row.caratsAvailable)}</div>
        <div className="text-[11px] text-muted-foreground">→ {formatCarats(row.balanceAfter)} after</div>
      </td>
      <td className="w-44 min-w-44 px-2 py-3">
        <PullsField row={row} showCost density="table" />
      </td>
      <td className="w-44 min-w-44 px-2 py-3">
        <TicketsField row={row} density="table" />
      </td>
      {showPaid ? (
        <td className="px-2 py-3 text-right font-mono tabular-nums">
          {row.paidCaratsAvailable > 0 || row.paidBalanceAfter > 0 ? (
            <>
              <div>{formatCarats(row.paidCaratsAvailable)}</div>
              <div className="text-xs text-muted-foreground">
                after {formatCarats(row.paidBalanceAfter)}
              </div>
            </>
          ) : (
            '—'
          )}
        </td>
      ) : null}
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
