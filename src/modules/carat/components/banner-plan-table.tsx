import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CopiesOddsBar } from '@/modules/carat/components/copies-odds-bar';
import { InfoHint } from '@/modules/carat/components/info-hint';
import { bannerImageUrl } from '@/modules/carat/data/banner-image';
import { resolveBannerLabel } from '@/modules/carat/data/card-names';
import type { TimelineEvent, TimelinePayload } from '@/modules/carat/data/timeline-types';
import { computePlan, type BannerPlanRow } from '@/modules/carat/model/plan';
import { removePlannedBanner, reorderPlannedBanners, setPlannedPulls, useCaratStore } from '@/store/carat.store';
import { cn } from '@/lib/utils';

type BannerPlanTableProps = { timeline: TimelinePayload };
type SortMode = 'date' | 'manual';

function formatCarats(value: number) {
  return Math.round(value).toLocaleString();
}

function pullsNeededForShortfall(shortfall: number) {
  return Math.ceil(Math.max(0, shortfall) / 150);
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'TBD';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function dateTime(event: TimelineEvent) {
  return new Date(event.global_release_date ?? event.jp_release_date ?? 0).getTime();
}

function windowText(event: TimelineEvent) {
  const duration = event.banner_duration_days ?? null;
  const start = formatDate(event.global_release_date ?? event.jp_release_date);
  const end = formatDate(event.estimated_end_date);
  return `${start} → ${end}${duration ? ` · ${duration}d` : ''}`;
}

/** True once the viewport is wide enough for the dense table; below this we render stacked cards. */
function useWideViewport() {
  const [isWide, setIsWide] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia('(min-width: 1024px)');
    const onChange = () => setIsWide(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isWide;
}

function usePullControls(row: BannerPlanRow) {
  const maxAffordable = Math.max(0, Math.floor(row.caratsAvailable / 150));
  const updatePulls = (value: number) => setPlannedPulls(row.event.id, Math.max(0, Math.floor(value || 0)));
  return { maxAffordable, updatePulls };
}

function BannerIdentity(props: { row: BannerPlanRow; showWindow?: boolean }) {
  const { row, showWindow } = props;
  return (
    <div className="flex items-center gap-3">
      <img src={bannerImageUrl(row.event)} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" loading="lazy" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{resolveBannerLabel(row.event)}</div>
        {showWindow ? <div className="mt-0.5 truncate text-[11px] text-muted-foreground tabular-nums">{windowText(row.event)}</div> : null}
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge variant="outline">{row.event.card_type}</Badge>
          <Badge variant="secondary">{row.event.prediction?.kind === 'confirmed' ? 'Confirmed' : row.event.prediction?.kind === 'interpolated' ? 'Estimated' : 'Predicted'}</Badge>
        </div>
      </div>
    </div>
  );
}

function PullsField(props: { row: BannerPlanRow; showCost?: boolean }) {
  const { row, showCost } = props;
  const { maxAffordable, updatePulls } = usePullControls(row);
  return (
    <div>
      <Input
        data-tutorial="carat-pulls-input"
        type="number"
        min={0}
        value={row.plannedBanner.plannedPulls}
        onChange={(event) => updatePulls(Number(event.target.value))}
        className="text-right tabular-nums"
        aria-label={`Planned pulls for ${resolveBannerLabel(row.event)}`}
      />
      <div className="mt-1 flex flex-wrap gap-1">
        <Button size="xs" variant="outline" onClick={() => updatePulls(200)}>1 spark</Button>
        <Button size="xs" variant="outline" onClick={() => updatePulls(row.plannedBanner.plannedPulls + 10)}>+10</Button>
        <Button size="xs" variant="outline" onClick={() => updatePulls(maxAffordable)}>max</Button>
      </div>
      {showCost ? <div className="mt-1 text-[11px] text-muted-foreground tabular-nums">cost {formatCarats(row.cost)}{row.paidCost > 0 ? ` · paid ${formatCarats(row.paidCost)}` : ''}</div> : null}
    </div>
  );
}

function BalanceVerdict(props: { row: BannerPlanRow; align?: 'left' | 'right' }) {
  const { row, align = 'right' } = props;
  return (
    <div className={cn('tabular-nums', align === 'right' ? 'text-right' : 'text-left', row.affordable ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
      <div className="font-semibold">{formatCarats(row.balanceAfter)}</div>
      <div className="text-[11px]">{row.affordable ? 'Affordable ✓' : `Short by ${formatCarats(Math.abs(row.balanceAfter))} carats — add ~${pullsNeededForShortfall(Math.abs(row.balanceAfter)).toLocaleString()} pulls`}</div>
    </div>
  );
}

function SortablePlanRow(props: { row: BannerPlanRow; showPaid: boolean }) {
  const { row, showPaid } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.event.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <tr ref={setNodeRef} style={style} className={cn('border-b align-middle', isDragging && 'relative z-10 bg-accent shadow-md')}>
      <td className="w-10 px-2 py-3">
        <button type="button" className="touch-none cursor-grab text-muted-foreground active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="size-4" />
          <span className="sr-only">Reorder banner</span>
        </button>
      </td>
      <td className="min-w-[220px] px-2 py-3">
        <BannerIdentity row={row} showWindow />
      </td>
      <td className="px-2 py-3 text-right tabular-nums">{formatCarats(row.caratsAvailable)}</td>
      <td className="w-36 px-2 py-3">
        <PullsField row={row} showCost />
      </td>
      {showPaid ? (
        <td className="px-2 py-3 text-right tabular-nums">
          {row.paidCaratsAvailable > 0 || row.paidBalanceAfter > 0 ? (
            <>
              <div>{formatCarats(row.paidCaratsAvailable)}</div>
              <div className="text-[11px] text-muted-foreground">after {formatCarats(row.paidBalanceAfter)}</div>
            </>
          ) : '—'}
        </td>
      ) : null}
      <td data-tutorial="carat-balance" className="px-2 py-3">
        <BalanceVerdict row={row} />
      </td>
      <td data-tutorial="carat-odds" className="px-2 py-3 text-left">
        <CopiesOddsBar pulls={row.plannedBanner.plannedPulls} startingDupes={row.plannedBanner.startingDupes} />
      </td>
      <td className="w-10 px-2 py-3 text-right">
        <Button size="icon-sm" variant="ghost" onClick={() => removePlannedBanner(row.event.id)} aria-label="Remove banner">
          <Trash2 className="size-4" />
        </Button>
      </td>
    </tr>
  );
}

function SortablePlanCard(props: { row: BannerPlanRow; showPaid: boolean }) {
  const { row, showPaid } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.event.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={cn('rounded-xl border bg-card p-3 shadow-sm', isDragging && 'relative z-10 shadow-md')}>
      <div className="flex items-start gap-2">
        <button type="button" className="mt-1 touch-none cursor-grab text-muted-foreground active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="size-4" />
          <span className="sr-only">Reorder banner</span>
        </button>
        <div className="min-w-0 flex-1">
          <BannerIdentity row={row} showWindow />
        </div>
        <Button size="icon-sm" variant="ghost" onClick={() => removePlannedBanner(row.event.id)} aria-label="Remove banner">
          <Trash2 className="size-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="grid gap-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            Pulls
            <InfoHint label="Pulls and sparks help" title="Pulls and sparks">One pull costs 150 carats. One spark is 200 pulls and can be exchanged for a guaranteed pickup copy.</InfoHint>
          </span>
          <PullsField row={row} showCost />
        </div>
        <div className="grid content-start gap-2 text-right">
          <div className="text-xs text-muted-foreground">Carats avail. <span className="font-medium tabular-nums text-foreground">{formatCarats(row.caratsAvailable)}</span></div>
          {showPaid && (row.paidCaratsAvailable > 0 || row.paidBalanceAfter > 0) ? (
            <div className="text-xs text-muted-foreground">Paid pool <span className="font-medium tabular-nums text-foreground">{formatCarats(row.paidCaratsAvailable)}</span></div>
          ) : null}
          <div className="mt-1 rounded-lg border bg-muted/40 p-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground">Balance</div>
            <BalanceVerdict row={row} />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <CopiesOddsBar pulls={row.plannedBanner.plannedPulls} startingDupes={row.plannedBanner.startingDupes} className="min-w-0" />
      </div>
    </div>
  );
}

export function BannerPlanTable(props: BannerPlanTableProps) {
  const { timeline } = props;
  const [sortMode, setSortMode] = useState<SortMode>('date');
  const isWide = useWideViewport();
  const settings = useCaratStore((state) => state.settings);
  const plannedBanners = useCaratStore((state) => state.plannedBanners);
  const paidPurchases = useCaratStore((state) => state.paidPurchases);
  const showPaid = settings.trackPaidCarats;
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const rows = useMemo(() => {
    const plan = computePlan(settings, timeline, plannedBanners, paidPurchases);
    if (sortMode === 'manual') {
      return [...plan].sort((a, b) => a.plannedBanner.order - b.plannedBanner.order || dateTime(a.event) - dateTime(b.event));
    }
    return plan;
  }, [paidPurchases, plannedBanners, settings, sortMode, timeline]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = rows.map((row) => row.event.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    const nextIds = [...ids];
    const [moved] = nextIds.splice(oldIndex, 1);
    nextIds.splice(newIndex, 0, moved);
    reorderPlannedBanners(nextIds);
    setSortMode('manual');
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-background/60 p-8 text-center">
        <div className="text-sm font-semibold">Start with three quick steps</div>
        <ol className="mx-auto mt-3 w-fit space-y-1 text-left text-sm text-muted-foreground">
          <li>1. Set your carats in the panel on the left</li>
          <li>2. Add a banner with <span className="font-medium text-foreground">+ Add banner from timeline</span></li>
          <li>3. Set pulls and watch the balance verdict update</li>
        </ol>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button size="sm" variant={sortMode === 'date' ? 'secondary' : 'outline'} onClick={() => setSortMode('date')}>Date sort</Button>
        <Button size="sm" variant={sortMode === 'manual' ? 'secondary' : 'outline'} onClick={() => setSortMode('manual')}>Manual order</Button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rows.map((row) => row.event.id)} strategy={verticalListSortingStrategy}>
          {isWide ? (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2" />
                    <th className="px-2 py-2 text-left">Banner</th>
                    <th className="px-2 py-2 text-right">Carats avail.</th>
                    <th className="px-2 py-2 text-left">
                      <span className="inline-flex items-center gap-1">
                        Pulls
                        <InfoHint label="Pulls and sparks help" title="Pulls and sparks">One pull costs 150 carats. One spark is 200 pulls and can be exchanged for a guaranteed pickup copy.</InfoHint>
                      </span>
                    </th>
                    {showPaid ? <th className="px-2 py-2 text-right">Paid pool</th> : null}
                    <th className="px-2 py-2 text-right">Balance</th>
                    <th className="px-2 py-2 text-center">
                      <span className="inline-flex items-center gap-1">
                        Odds
                        <InfoHint label="Copy odds help" title="LB / MLB odds">LB means limit break copies. MLB usually means five total copies. The bar estimates the chance to end at each copy count.</InfoHint>
                      </span>
                    </th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>{rows.map((row) => <SortablePlanRow key={row.event.id} row={row} showPaid={showPaid} />)}</tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">{rows.map((row) => <SortablePlanCard key={row.event.id} row={row} showPaid={showPaid} />)}</div>
          )}
        </SortableContext>
      </DndContext>
    </div>
  );
}
