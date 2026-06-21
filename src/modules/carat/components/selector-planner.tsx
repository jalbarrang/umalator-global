import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CopiesOddsBar } from '@/modules/carat/components/copies-odds-bar';
import type { TimelinePayload } from '@/modules/carat/data/timeline-types';
import { copiesOdds } from '@/modules/carat/model/odds';
import { defaultPaidPackPurchases, paidCaratsFromPacks, paidPackDefinitions, type PaidPackId } from '@/modules/carat/model/paid';
import { selectorAnniversariesFromTimeline, type SelectorStepUp } from '@/modules/carat/model/selectors';
import { setPaidPackPurchase, setSelectorChoice, useCaratStore } from '@/store/carat.store';

export type SelectorPlannerProps = {
  timeline: TimelinePayload;
};

const packIds: PaidPackId[] = ['p11000', 'p7500', 'p1500'];

function formatDate(value: string | null) {
  if (!value) return 'TBD';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function formatUsd(value: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatCarats(value: number) {
  return Math.round(value).toLocaleString();
}

function stepUpKey(stepUp: SelectorStepUp) {
  return `${stepUp.rarity}-${stepUp.steps}`;
}

export function SelectorPlanner(props: SelectorPlannerProps) {
  const { timeline } = props;
  const settings = useCaratStore((state) => state.settings);
  const paidPurchases = useCaratStore((state) => state.paidPurchases);
  const selectorChoices = useCaratStore((state) => state.selectorChoices);
  const anniversaries = useMemo(() => selectorAnniversariesFromTimeline(timeline), [timeline]);
  const totals = useMemo(
    () => anniversaries.reduce(
      (summary, anniversary) => {
        const next = paidCaratsFromPacks(paidPurchases[anniversary.id] ?? defaultPaidPackPurchases, settings.server);
        return { paidCarats: summary.paidCarats + next.paidCarats, usd: summary.usd + next.usd };
      },
      { paidCarats: 0, usd: 0 }
    ),
    [anniversaries, paidPurchases, settings.server]
  );

  return (
    <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Selector / Step-up Planner</h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Track anniversary paid packs, choose selector targets, and preview step-up copy odds. Dates come from the live timeline; selector rosters are a v1 seed and can be extended as spreadsheet data is extracted.
          </p>
        </div>
        <div className="rounded-lg bg-muted/60 px-3 py-2 text-right text-xs tabular-nums">
          <div className="font-semibold">{formatCarats(totals.paidCarats)} paid carats</div>
          <div className="text-muted-foreground">{formatUsd(totals.usd)} cumulative</div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {anniversaries.map((anniversary) => {
          const purchases = { ...defaultPaidPackPurchases, ...paidPurchases[anniversary.id] };
          const summary = paidCaratsFromPacks(purchases, settings.server);
          const choices = selectorChoices[anniversary.id] ?? {};

          return (
            <article key={anniversary.id} className="rounded-xl border bg-background/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{anniversary.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{formatDate(anniversary.startDate)} → {formatDate(anniversary.endDate)}</div>
                </div>
                <Badge variant={anniversary.isConfirmed ? 'secondary' : 'outline'}>{anniversary.isConfirmed ? 'Confirmed' : 'Estimated'}</Badge>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {packIds.map((packId) => (
                  <label key={packId} className="space-y-1 text-xs">
                    <span className="text-muted-foreground">{paidPackDefinitions[packId].carats.toLocaleString()} pack</span>
                    <Input
                      type="number"
                      min={0}
                      value={purchases[packId]}
                      onChange={(event) => setPaidPackPurchase(anniversary.id, packId, Number(event.target.value))}
                      className="text-right tabular-nums"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-2 text-xs tabular-nums text-muted-foreground">
                This anniversary: <span className="font-medium text-foreground">{formatCarats(summary.paidCarats)}</span> paid carats · <span className="font-medium text-foreground">{formatUsd(summary.usd)}</span>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Select value={choices.uma ?? ''} onValueChange={(value) => setSelectorChoice(anniversary.id, { uma: value ?? undefined })} disabled={anniversary.selectors.uma.length === 0}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="3★ selector target" /></SelectTrigger>
                  <SelectContent>{anniversary.selectors.uma.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={choices.ssr ?? ''} onValueChange={(value) => setSelectorChoice(anniversary.id, { ssr: value ?? undefined })} disabled={anniversary.selectors.ssr.length === 0}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="SSR selector target" /></SelectTrigger>
                  <SelectContent>{anniversary.selectors.ssr.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
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
                        <span className="font-medium">{stepUp.rarity === 'ssr' ? 'SSR' : '3★'} step-up · max {stepUp.steps} steps</span>
                        <Input
                          type="number"
                          min={0}
                          max={stepUp.steps}
                          value={steps}
                          onChange={(event) => setSelectorChoice(anniversary.id, {
                            stepUps: { ...choices.stepUps, [key]: Math.min(stepUp.steps, Math.max(0, Math.floor(Number(event.target.value) || 0))) }
                          })}
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
    </section>
  );
}
