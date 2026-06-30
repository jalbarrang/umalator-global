import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimelineEvent, TimelinePayload } from '@/modules/carat/data/timeline-types';
import { monthlyRecurringCarats } from '@/modules/carat/model/income';
import { computePlan } from '@/modules/carat/model/plan';
import { defaultCaratSettings, type CaratSettings, type PlannedBanner } from '@/store/carat.store';

// Real-world plan captured from the app ("Plan 2"). This pins the end-to-end
// evaluation so income, ticket accrual, cost and balance stay correct.
//
// Reference instant is pinned: ticket/carat accrual normalises every date to
// the 22:00 UTC daily reset, so any "now" that falls on 2026-06-29's reset
// produces these exact numbers.
const NOW = '2026-06-29T22:00:00.000Z';

const PLAN_SETTINGS: CaratSettings = {
  ...defaultCaratSettings,
  server: 'global',
  startingFreeCarats: 26_295,
  startingPaidCarats: 1_388,
  umaTickets: 7,
  supportTickets: 26,
  monthlyCarats: 15_000, // legacy field, ignored by the model
  monthlyTickets: 27, // legacy field, ignored by the model
  teamTrialsClass: 'class-6',
  clubRank: 'b',
  cmPlacement: 'none',
  lohRank: 'none',
  dailyCaratPack: true,
  trainingPass: 'free',
  trackPaidCarats: false
};

const PLANNED_BANNERS: PlannedBanner[] = [
  { id: 'example-banner', plannedPulls: 200, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 0 },
  { id: 'support-banner-2022_30111', plannedPulls: 400, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 1 },
  { id: 'support-banner-2022_30117', plannedPulls: 100, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 2 },
  { id: 'support-banner-2022_30127', plannedPulls: 200, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 3 },
  { id: 'banner-2022_30126', plannedPulls: 200, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 4 },
  { id: 'banner-2022_30134', plannedPulls: 200, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 5 },
  { id: 'banner-2023_30158', plannedPulls: 200, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 6 },
  { id: 'banner-2023_30160', plannedPulls: 200, startingDupes: 0, copyGoals: {}, ownedCopies: {}, order: 7 }
];

function banner(
  id: string,
  globalReleaseDate: string,
  cardType: 'character' | 'support'
): TimelineEvent {
  return {
    id,
    type: cardType === 'character' ? 'character_banner' : 'support_card_banner',
    card_type: cardType,
    global_release_date: globalReleaseDate
  };
}

// Real release dates for the planned banners. "example-banner" is intentionally
// absent — the model must drop planned banners with no matching timeline event.
const TIMELINE: TimelinePayload = {
  anniversaries: [],
  calculation: {},
  version: 'test',
  events: [
    banner('support-banner-2022_30111', '2026-07-22T22:00:00Z', 'support'),
    banner('support-banner-2022_30117', '2026-08-11T22:00:00Z', 'support'),
    banner('support-banner-2022_30127', '2026-09-18T22:00:00Z', 'support'),
    banner('banner-2022_30126', '2026-09-18T22:00:00Z', 'character'),
    banner('banner-2022_30134', '2026-10-13T22:00:00Z', 'character'),
    banner('banner-2023_30158', '2027-01-12T22:00:00Z', 'character'),
    banner('banner-2023_30160', '2027-01-19T22:00:00Z', 'character')
  ]
};

type ExpectedRow = {
  id: string;
  ticketType: 'uma' | 'support';
  ticketsAvailable: number;
  ticketsUsed: number;
  ticketsSaved: number;
  ticketsRemaining: number;
  cost: number;
  affordable: boolean;
  balanceAfter: number; // rounded to the nearest carat
};

// Sorted by banner date. Income: 8,414/mo carats + 6 uma + 6 support tickets/mo
// (no CM/LoH since both are "none"). Uma and support pools accrue and deplete
// independently; every banner plans enough pulls to drain its pool, so
// ticketsUsed == ticketsAvailable and ticketsRemaining == 0 on each row.
const EXPECTED: ExpectedRow[] = [
  { id: 'support-banner-2022_30111', ticketType: 'support', ticketsAvailable: 30, ticketsUsed: 30, ticketsSaved: 4_500, ticketsRemaining: 0, cost: 55_500, affordable: false, balanceAfter: -22_847 },
  { id: 'support-banner-2022_30117', ticketType: 'support', ticketsAvailable: 4, ticketsUsed: 4, ticketsSaved: 600, ticketsRemaining: 0, cost: 14_400, affordable: false, balanceAfter: -31_718 },
  { id: 'support-banner-2022_30127', ticketType: 'support', ticketsAvailable: 7, ticketsUsed: 7, ticketsSaved: 1_050, ticketsRemaining: 0, cost: 28_950, affordable: false, balanceAfter: -50_163 },
  { id: 'banner-2022_30126', ticketType: 'uma', ticketsAvailable: 22, ticketsUsed: 22, ticketsSaved: 3_300, ticketsRemaining: 0, cost: 26_700, affordable: false, balanceAfter: -76_863 },
  { id: 'banner-2022_30134', ticketType: 'uma', ticketsAvailable: 5, ticketsUsed: 5, ticketsSaved: 750, ticketsRemaining: 0, cost: 29_250, affordable: false, balanceAfter: -99_201 },
  { id: 'banner-2023_30158', ticketType: 'uma', ticketsAvailable: 18, ticketsUsed: 18, ticketsSaved: 2_700, ticketsRemaining: 0, cost: 27_300, affordable: false, balanceAfter: -101_345 },
  { id: 'banner-2023_30160', ticketType: 'uma', ticketsAvailable: 2, ticketsUsed: 2, ticketsSaved: 300, ticketsRemaining: 0, cost: 29_700, affordable: false, balanceAfter: -129_109 }
];

describe('carat plan scenario — Plan 2', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives monthly recurring income from the tables only', () => {
    const monthly = monthlyRecurringCarats(PLAN_SETTINGS);
    // daily quest (75 + 150/7 per day) + club B (1350) + daily pack (2000) +
    // free pass (500) + team trials class 6 (375/wk).
    expect(monthly.carats).toBeCloseTo(8_414.42, 2);
    // baseline 4/type + free pass 2/type.
    expect(monthly.umaTickets).toBe(6);
    expect(monthly.supportTickets).toBe(6);
  });

  it('drops planned banners with no matching timeline event', () => {
    const rows = computePlan(PLAN_SETTINGS, TIMELINE, PLANNED_BANNERS);
    expect(rows).toHaveLength(7);
    expect(rows.some((row) => row.event.id === 'example-banner')).toBe(false);
  });

  it('orders rows by banner date', () => {
    const rows = computePlan(PLAN_SETTINGS, TIMELINE, PLANNED_BANNERS);
    expect(rows.map((row) => row.event.id)).toEqual(EXPECTED.map((row) => row.id));
  });

  it('evaluates tickets, cost, and balance per banner', () => {
    const rows = computePlan(PLAN_SETTINGS, TIMELINE, PLANNED_BANNERS);

    for (const [index, row] of rows.entries()) {
      const expected = EXPECTED[index];
      expect(row.event.id, `row ${index} id`).toBe(expected.id);
      expect(row.ticketType, `${expected.id} ticketType`).toBe(expected.ticketType);
      expect(row.ticketsAvailable, `${expected.id} ticketsAvailable`).toBe(expected.ticketsAvailable);
      expect(row.ticketsUsed, `${expected.id} ticketsUsed`).toBe(expected.ticketsUsed);
      expect(row.ticketsSaved, `${expected.id} ticketsSaved`).toBe(expected.ticketsSaved);
      expect(row.ticketsRemaining, `${expected.id} ticketsRemaining`).toBe(expected.ticketsRemaining);
      expect(row.cost, `${expected.id} cost`).toBe(expected.cost);
      expect(row.affordable, `${expected.id} affordable`).toBe(expected.affordable);
      expect(Math.round(row.balanceAfter), `${expected.id} balanceAfter`).toBe(expected.balanceAfter);
    }
  });

  it('keeps the support ticket pool independent from the uma pool', () => {
    const rows = computePlan(PLAN_SETTINGS, TIMELINE, PLANNED_BANNERS);
    // Support banners drain only the support pool (30 + 4 + 7 = 41 = 26 start +
    // accrual); the first uma banner still has its full uma pool (22) available
    // because no earlier banner touched it.
    const supportUsed = rows
      .filter((row) => row.ticketType === 'support')
      .reduce((total, row) => total + row.ticketsUsed, 0);
    const firstUma = rows.find((row) => row.event.id === 'banner-2022_30126');
    expect(supportUsed).toBe(41);
    expect(firstUma?.ticketType).toBe('uma');
    expect(firstUma?.ticketsAvailable).toBe(22);
  });
});
