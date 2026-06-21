import type { TimelineEvent, TimelinePayload } from '@/modules/carat/data/timeline-types';
import { caratsAvailableAt, projectIncome } from '@/modules/carat/model/income';
import { CARAT_PER_PULL } from '@/modules/carat/model/income-tables';
import { totalPaidCaratsFromPurchases, type PaidPackPurchases } from '@/modules/carat/model/paid';
import type { CaratSettings, PlannedBanner } from '@/store/carat.store';

export type BannerPlanRow = {
  event: TimelineEvent;
  plannedBanner: PlannedBanner;
  caratsAvailable: number;
  paidCaratsAvailable: number;
  freeCaratsAvailable: number;
  cost: number;
  paidCost: number;
  freeCost: number;
  balanceAfter: number;
  paidBalanceAfter: number;
  freeBalanceAfter: number;
  affordable: boolean;
};

function eventStartDate(event: TimelineEvent) {
  return new Date(event.global_release_date ?? event.jp_release_date ?? 0);
}

function eventStartTime(event: TimelineEvent) {
  const time = eventStartDate(event).getTime();
  return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
}

export function computePlan(
  settings: CaratSettings,
  timeline: TimelinePayload,
  plannedBanners: PlannedBanner[],
  paidPurchases: Record<string, Partial<PaidPackPurchases>> = {}
): BannerPlanRow[] {
  const eventsById = new Map(timeline.events.map((event) => [event.id, event]));
  const rows = plannedBanners
    .map((plannedBanner) => {
      const event = eventsById.get(plannedBanner.id);
      return event ? { event, plannedBanner } : null;
    })
    .filter((row): row is { event: TimelineEvent; plannedBanner: PlannedBanner } => row !== null)
    .sort((a, b) => eventStartTime(a.event) - eventStartTime(b.event));

  let previousDate = new Date();
  let runningFreeBalance = settings.startingFreeCarats;
  let runningPaidBalance = settings.trackPaidCarats
    ? settings.startingPaidCarats +
      totalPaidCaratsFromPurchases(paidPurchases, settings.server).paidCarats
    : 0;

  return rows.map(({ event, plannedBanner }) => {
    const startDate = eventStartDate(event);
    const income = projectIncome(settings, timeline, previousDate, startDate);
    runningFreeBalance += income.carats + income.tickets * CARAT_PER_PULL;

    const cost = plannedBanner.plannedPulls * CARAT_PER_PULL;
    const paidCost = settings.trackPaidCarats ? Math.min(runningPaidBalance, cost) : 0;
    const freeCost = cost - paidCost;
    runningPaidBalance -= paidCost;
    runningFreeBalance -= freeCost;
    previousDate = startDate;

    const freeCaratsAvailable = caratsAvailableAt(settings, timeline, startDate);
    const balanceAfter = runningFreeBalance + runningPaidBalance;

    return {
      event,
      plannedBanner,
      caratsAvailable: freeCaratsAvailable + runningPaidBalance,
      paidCaratsAvailable: runningPaidBalance + paidCost,
      freeCaratsAvailable,
      cost,
      paidCost,
      freeCost,
      balanceAfter,
      paidBalanceAfter: runningPaidBalance,
      freeBalanceAfter: runningFreeBalance,
      affordable: balanceAfter >= 0
    };
  });
}
