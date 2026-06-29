import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { CopiesOddsBar } from '@/modules/carat/components/copies-odds-bar';
import type { TimelinePayload } from '@/modules/carat/data/timeline-types';
import { copiesOdds } from '@/modules/carat/model/odds';
import {
  defaultPaidPackPurchases,
  paidCaratsFromPacks,
  paidPackDefinitions,
  type PaidPackId
} from '@/modules/carat/model/paid';
import {
  selectorAnniversariesFromTimeline,
  type SelectorStepUp
} from '@/modules/carat/model/selectors';
import {
  getActivePlan,
  setPaidPackPurchase,
  setSelectorChoice,
  useCaratStore
} from '@/store/carat.store';

export type SelectorPlannerProps = {
  timeline: TimelinePayload;
};

const packIds: PaidPackId[] = ['p11000', 'p7500', 'p1500'];

function formatDate(value: string | null) {
  if (!value) return 'TBD';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function formatUsd(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}

function formatCarats(value: number) {
  return Math.round(value).toLocaleString();
}

function stepUpKey(stepUp: SelectorStepUp) {
  return `${stepUp.rarity}-${stepUp.steps}`;
}

export function SelectorPlanner(props: SelectorPlannerProps) {
  const { timeline } = props;
  const settings = useCaratStore((state) => getActivePlan(state).settings);
  const paidPurchases = useCaratStore((state) => getActivePlan(state).paidPurchases);
  const selectorChoices = useCaratStore((state) => getActivePlan(state).selectorChoices);
  const [hidePast, setHidePast] = useState(true);
  const anniversaries = useMemo(() => selectorAnniversariesFromTimeline(timeline), [timeline]);
  const [now] = useState(() => Date.now());
  const isPast = useCallback(
    (anniversary: (typeof anniversaries)[number]) => {
      if (!anniversary.endDate) return false;
      const end = new Date(anniversary.endDate).getTime();
      return !Number.isNaN(end) && end < now;
    },
    [now]
  );
  const pastCount = useMemo(() => anniversaries.filter(isPast).length, [anniversaries, isPast]);
  const visibleAnniversaries = hidePast
    ? anniversaries.filter((anniversary) => !isPast(anniversary))
    : anniversaries;
  const totals = useMemo(
    () =>
      anniversaries.reduce(
        (summary, anniversary) => {
          const next = paidCaratsFromPacks(
            paidPurchases[anniversary.id] ?? defaultPaidPackPurchases,
            settings.server
          );
          return { paidCarats: summary.paidCarats + next.paidCarats, usd: summary.usd + next.usd };
        },
        { paidCarats: 0, usd: 0 }
      ),
    [anniversaries, paidPurchases, settings.server]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Selector / Step-up Planner</h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Track anniversary paid packs, choose selector targets, and preview step-up copy odds.
            Dates come from the live timeline; selector rosters are a v1 seed and can be extended as
            spreadsheet data is extracted.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:flex-col sm:items-end">
          {pastCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHidePast((value) => !value)}
            >
              {hidePast ? `Show past (${pastCount})` : 'Hide past'}
            </Button>
          ) : null}
          <div className="rounded-lg bg-muted/60 px-3 py-2 text-right text-xs tabular-nums">
            <div className="font-semibold">{formatCarats(totals.paidCarats)} paid carats</div>
            <div className="text-muted-foreground">{formatUsd(totals.usd)} cumulative</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {visibleAnniversaries.map((anniversary) => {
          const purchases = { ...defaultPaidPackPurchases, ...paidPurchases[anniversary.id] };
          const summary = paidCaratsFromPacks(purchases, settings.server);
          const choices = selectorChoices[anniversary.id] ?? {};

          return (
            <article key={anniversary.id} className="rounded-xl border bg-background/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{anniversary.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDate(anniversary.startDate)} → {formatDate(anniversary.endDate)}
                  </div>
                </div>
                <Badge variant={anniversary.isConfirmed ? 'secondary' : 'outline'}>
                  {anniversary.isConfirmed ? 'Confirmed' : 'Estimated'}
                </Badge>
              </div>

              <div className="mt-3 grid gap-2">
                {packIds.map((packId) => (
                  <label key={packId} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {paidPackDefinitions[packId].carats.toLocaleString()} pack
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Decrease ${paidPackDefinitions[packId].carats.toLocaleString()} pack`}
                        disabled={purchases[packId] <= 0}
                        onClick={() =>
                          setPaidPackPurchase(
                            anniversary.id,
                            packId,
                            Math.max(0, purchases[packId] - 1)
                          )
                        }
                      >
                        −
                      </Button>
                      <Input
                        type="number"
                        min={0}
                        value={purchases[packId]}
                        onChange={(event) =>
                          setPaidPackPurchase(anniversary.id, packId, Number(event.target.value))
                        }
                        className="w-20 text-right tabular-nums"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Increase ${paidPackDefinitions[packId].carats.toLocaleString()} pack`}
                        onClick={() =>
                          setPaidPackPurchase(anniversary.id, packId, purchases[packId] + 1)
                        }
                      >
                        +
                      </Button>
                    </div>
                  </label>
                ))}
              </div>
              <div className="mt-2 text-xs tabular-nums text-muted-foreground">
                This anniversary:{' '}
                <span className="font-medium text-foreground">
                  {formatCarats(summary.paidCarats)}
                </span>{' '}
                paid carats ·{' '}
                <span className="font-medium text-foreground">{formatUsd(summary.usd)}</span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Select
                  value={choices.uma ?? ''}
                  onValueChange={(value) =>
                    setSelectorChoice(anniversary.id, { uma: value ?? undefined })
                  }
                  disabled={anniversary.selectors.uma.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="3★ selector target" />
                  </SelectTrigger>
                  <SelectContent>
                    {anniversary.selectors.uma.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={choices.ssr ?? ''}
                  onValueChange={(value) =>
                    setSelectorChoice(anniversary.id, { ssr: value ?? undefined })
                  }
                  disabled={anniversary.selectors.ssr.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="SSR selector target" />
                  </SelectTrigger>
                  <SelectContent>
                    {anniversary.selectors.ssr.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-3 space-y-2">
                {anniversary.stepUps.map((stepUp) => {
                  const key = stepUpKey(stepUp);
                  const steps = choices.stepUps?.[key] ?? 0;
                  const odds = copiesOdds({ pulls: steps, mode: 'stepup' });
                  return (
                    <div key={key} className="rounded-lg bg-muted/50 p-2">
                      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium">
                          {stepUp.rarity === 'ssr' ? 'SSR' : '3★'} step-up · max {stepUp.steps}{' '}
                          steps
                        </span>
                        <Input
                          type="number"
                          min={0}
                          max={stepUp.steps}
                          value={steps}
                          onChange={(event) =>
                            setSelectorChoice(anniversary.id, {
                              stepUps: {
                                ...choices.stepUps,
                                [key]: Math.min(
                                  stepUp.steps,
                                  Math.max(0, Math.floor(Number(event.target.value) || 0))
                                )
                              }
                            })
                          }
                          className="h-7 w-20 text-right tabular-nums"
                        />
                      </div>
                      <CopiesOddsBar pulls={steps} odds={odds} />
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
