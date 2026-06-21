import type { TimelineEvent } from '@/modules/carat/data/timeline-types';

function formatDay(date: Date, withYear: boolean) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {})
  }).format(date);
}

/** Compact banner window, e.g. "Jul 2 → Jul 13 · 11d". Year is shown only when it isn't the current year or the range spans two years. */
export function windowText(event: TimelineEvent) {
  const startRaw = event.global_release_date ?? event.jp_release_date;
  const endRaw = event.estimated_end_date;
  const duration = event.banner_duration_days ?? null;
  const durationText = duration ? ` · ${duration}d` : '';

  const start = startRaw ? new Date(startRaw) : null;
  const end = endRaw ? new Date(endRaw) : null;
  if (!start && !end) return `TBD${durationText}`;

  const currentYear = new Date().getFullYear();
  const crossesYears = start && end && start.getFullYear() !== end.getFullYear();
  const yearFor = (date: Date) => crossesYears || date.getFullYear() !== currentYear;
  // Same-year ranges only repeat the year once, on the end date.
  const startNeedsYear = Boolean(start && crossesYears && yearFor(start));
  const endNeedsYear = end ? yearFor(end) : false;

  const startText = start ? formatDay(start, startNeedsYear) : 'TBD';
  const endText = end ? formatDay(end, endNeedsYear) : 'TBD';
  return `${startText} → ${endText}${durationText}`;
}
