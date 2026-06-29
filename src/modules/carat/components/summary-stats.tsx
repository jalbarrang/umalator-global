import { useQuery } from '@tanstack/react-query';
import { monthlyRecurringCarats } from '@/modules/carat/model/income';
import { fetchTimeline } from '@/modules/carat/data/timeline-client';
import { computePlan } from '@/modules/carat/model/plan';
import { getActivePlan, useCaratStore } from '@/store/carat.store';
import { cn } from '@/lib/utils';

function formatCarats(value: number) {
  return Math.round(value).toLocaleString();
}

function SecondaryMetric(props: { label: string; value: string; sub: string }) {
  const { label, value, sub } = props;

  return (
    <div className="px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

export function SummaryStats() {
  const settings = useCaratStore((state) => getActivePlan(state).settings);
  const plannedBanners = useCaratStore((state) => getActivePlan(state).plannedBanners);
  const paidPurchases = useCaratStore((state) => getActivePlan(state).paidPurchases);
  const timelineQuery = useQuery({
    queryKey: ['caratTimeline'],
    queryFn: fetchTimeline,
    staleTime: 5 * 60 * 1000
  });
  const monthly = monthlyRecurringCarats(settings);
  const plan = timelineQuery.data
    ? computePlan(settings, timelineQuery.data, plannedBanners, paidPurchases)
    : [];
  const plannedSpend = plan.reduce((total, row) => total + row.cost, 0);
  const plannedPulls = plan.reduce((total, row) => total + row.plannedBanner.plannedPulls, 0);
  const lastRow = plan.at(-1);

  const affordable = lastRow?.affordable === true;
  const short = lastRow?.affordable === false;
  const shortfall = lastRow ? Math.abs(lastRow.balanceAfter) : 0;

  return (
    <section
      data-tutorial="carat-summary"
      className="mb-4 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.45fr)]"
    >
      {/* Primary verdict — the one answer this page exists to deliver. */}
      <div
        className={cn(
          'flex flex-col justify-between rounded-xl border p-4 shadow-sm',
          affordable && 'border-emerald-600/30 bg-emerald-500/[0.06] dark:border-emerald-400/25',
          short && 'border-destructive/30 bg-destructive/[0.06]',
          !lastRow && 'bg-card'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-muted-foreground">
            Balance at last banner
          </span>
          {lastRow ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                affordable && 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-300',
                short && 'bg-destructive/15 text-destructive'
              )}
            >
              {affordable ? 'Affordable ✓' : 'Short'}
            </span>
          ) : null}
        </div>
        <div className="mt-3">
          <div
            className={cn(
              'text-4xl font-bold tabular-nums',
              affordable && 'text-emerald-600 dark:text-emerald-400',
              short && 'text-destructive'
            )}
          >
            {lastRow ? formatCarats(lastRow.balanceAfter) : '—'}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {lastRow
              ? affordable
                ? 'Carats left over after your final planned spend.'
                : `Short by ${formatCarats(shortfall)} carats — add about ${Math.ceil(shortfall / 150).toLocaleString()} more pulls of income.`
              : 'Add a banner from the timeline to project your balance.'}
          </p>
        </div>
      </div>

      {/* Supporting context — grouped, visually subordinate to the verdict. */}
      <div className="grid grid-cols-1 divide-y rounded-xl border bg-card shadow-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        <SecondaryMetric
          label="Current Carats"
          value={settings.startingFreeCarats.toLocaleString()}
          sub={settings.trackPaidCarats ? '+ paid pool tracked' : '+ paid not tracked'}
        />
        <SecondaryMetric
          label="Starting Tickets"
          value={`${settings.umaTickets.toLocaleString()} / ${settings.supportTickets.toLocaleString()}`}
          sub="Uma / Support · typed pools"
        />
        <SecondaryMetric
          label="Monthly Income"
          value={formatCarats(monthly.carats)}
          sub={`${formatCarats(monthly.tickets)} tickets · recurring`}
        />
        <SecondaryMetric
          label="Planned Spend"
          value={plannedSpend > 0 ? formatCarats(plannedSpend) : '0'}
          sub={`${plannedPulls.toLocaleString()} pulls · ${plan.length.toLocaleString()} banner${plan.length === 1 ? '' : 's'}`}
        />
      </div>
    </section>
  );
}
