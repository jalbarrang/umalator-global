import { describe, expect, it } from 'vitest';
import type { TimelineEvent, TimelinePayload } from '@/modules/carat/data/timeline-types';
import { computePlan } from '@/modules/carat/model/plan';
import type { CaratSettings, PlannedBanner } from '@/store/carat.store';

function daysFromNow(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(23, 0, 0, 0);
  return date.toISOString();
}

function banner(id: string, days: number): TimelineEvent {
  return {
    id,
    type: 'banner',
    card_type: 'character',
    global_release_date: daysFromNow(days),
    estimated_end_date: daysFromNow(days + 10),
    prediction: { kind: 'confirmed' }
  };
}

const settings: CaratSettings = {
  server: 'global',
  startingFreeCarats: 0,
  startingPaidCarats: 0,
  umaTickets: 0,
  supportTickets: 0,
  monthlyCarats: 30000,
  monthlyTickets: 0,
  teamTrialsClass: 'none',
  clubRank: 'none',
  cmPlacement: 'none',
  lohRank: 'none',
  dailyCaratPack: false,
  trainingPass: 'free',
  trackPaidCarats: false
};

function timeline(events: TimelineEvent[]): TimelinePayload {
  return { events, anniversaries: [], calculation: {}, version: 'test' };
}

describe('computePlan', () => {
  it('sorts by banner date, calculates pull cost, and chains running balance', () => {
    const early = banner('early', 1);
    const late = banner('late', 40);
    const plan: PlannedBanner[] = [
      { id: 'late', plannedPulls: 0, startingDupes: 0, order: 0 },
      { id: 'early', plannedPulls: 100, startingDupes: 0, order: 1 }
    ];

    const rows = computePlan(settings, timeline([late, early]), plan);

    expect(rows.map((row) => row.event.id)).toEqual(['early', 'late']);
    expect(rows[0].cost).toBe(15000);
    expect(rows[0].balanceAfter).toBeLessThan(0);
    expect(rows[0].affordable).toBe(false);
    expect(rows[1].cost).toBe(0);
    expect(rows[1].balanceAfter).toBeGreaterThan(0);
    expect(rows[1].affordable).toBe(true);
  });

  it('ignores planned banners that are not present in the timeline', () => {
    const rows = computePlan(settings, timeline([banner('real', 5)]), [
      { id: 'example-banner', plannedPulls: 200, startingDupes: 0, order: 0 },
      { id: 'real', plannedPulls: 1, startingDupes: 0, order: 1 }
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].event.id).toBe('real');
    expect(rows[0].cost).toBe(150);
  });

  it('tracks a paid pool and spends paid carats first when enabled', () => {
    const rows = computePlan(
      { ...settings, trackPaidCarats: true, startingPaidCarats: 1500 },
      timeline([banner('paid', 1)]),
      [{ id: 'paid', plannedPulls: 20, startingDupes: 0, order: 0 }],
      { '1st-anniversary': { p1500: 1 } }
    );

    expect(rows[0].cost).toBe(3000);
    expect(rows[0].paidCaratsAvailable).toBe(3000);
    expect(rows[0].paidCost).toBe(3000);
    expect(rows[0].freeCost).toBe(0);
    expect(rows[0].paidBalanceAfter).toBe(0);
    expect(rows[0].freeBalanceAfter).toBeGreaterThanOrEqual(0);
    expect(rows[0].affordable).toBe(true);
  });
});
