import { describe, expect, it, vi } from 'vitest';
import type { TimelinePayload } from '@/modules/carat/data/timeline-types';
import { type CaratSettings, defaultCaratSettings } from '@/store/carat.store';
import { caratsAvailableAt, monthlyRecurringCarats, projectIncome } from './income';

const emptyTimeline: TimelinePayload = {
  anniversaries: [],
  calculation: {},
  events: [],
  version: 'test'
};

describe('income model', () => {
  it('calculates monthly recurring carats for a known settings combo', () => {
    const income = monthlyRecurringCarats({
      ...defaultCaratSettings,
      monthlyCarats: 15_000,
      monthlyTickets: 27,
      teamTrialsClass: 'class-4',
      clubRank: 'a',
      dailyCaratPack: false,
      trainingPass: 'paid'
    });

    expect(income.carats).toBeCloseTo(20_101.75);
    expect(income.tickets).toBe(27);
  });

  it('adds Champion Meeting rewards for CM events inside the window only', () => {
    const timeline: TimelinePayload = {
      ...emptyTimeline,
      events: [
        {
          id: 'cm-in-window',
          card_type: null,
          type: 'champions_meeting',
          global_release_date: '2026-02-15T22:00:00.000Z'
        },
        {
          id: 'cm-outside-window',
          card_type: null,
          type: 'champions_meeting',
          global_release_date: '2026-04-15T22:00:00.000Z'
        }
      ]
    };
    const settings: CaratSettings = {
      ...defaultCaratSettings,
      monthlyCarats: 0,
      monthlyTickets: 0,
      teamTrialsClass: 'class-1',
      clubRank: 'd+',
      dailyCaratPack: false,
      trainingPass: 'free',
      lohRank: 'silver-4',
      cmPlacement: 'champion'
    };

    const withEvent = projectIncome(settings, timeline, new Date('2026-02-01T23:00:00.000Z'), new Date('2026-03-01T23:00:00.000Z'));
    const withoutEvent = projectIncome(settings, emptyTimeline, new Date('2026-02-01T23:00:00.000Z'), new Date('2026-03-01T23:00:00.000Z'));

    expect(withEvent.carats - withoutEvent.carats).toBeCloseTo(3300);
    expect(withEvent.tickets - withoutEvent.tickets).toBeCloseTo(10);
  });

  it('keeps caratsAvailableAt monotonic as dates move forward', () => {
    vi.setSystemTime(new Date('2026-01-01T23:00:00.000Z'));

    const earlier = caratsAvailableAt(defaultCaratSettings, emptyTimeline, new Date('2026-02-01T23:00:00.000Z'));
    const later = caratsAvailableAt(defaultCaratSettings, emptyTimeline, new Date('2026-03-01T23:00:00.000Z'));

    expect(later).toBeGreaterThan(earlier);

    vi.useRealTimers();
  });
});
