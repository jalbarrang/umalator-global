import { describe, expect, it } from 'vitest';
import type { TimelinePayload } from '@/modules/carat/data/timeline-types';
import { selectorAnniversariesFromTimeline } from '@/modules/carat/model/selectors';

describe('selectorAnniversariesFromTimeline', () => {
  it('binds anniversary Global dates from the timeline payload', () => {
    const timeline: TimelinePayload = {
      events: [],
      calculation: {},
      version: 'test',
      anniversaries: [
        {
          label: '1st Anniversary',
          global_date: '2023-06-20T00:00:00.000Z',
          jp_date: '2022-02-24T00:00:00.000Z',
          index: 1,
          is_confirmed: true
        }
      ]
    };

    const [anniversary] = selectorAnniversariesFromTimeline(timeline);

    expect(anniversary.id).toBe('1st-anniversary');
    expect(anniversary.startDate).toBe('2023-06-20T00:00:00.000Z');
    expect(anniversary.label).toBe('1st Anniversary');
    expect(anniversary.isConfirmed).toBe(true);
  });
});
