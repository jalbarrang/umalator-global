import { useQuery } from '@tanstack/react-query';
import { fetchTimeline } from '@/modules/carat/data/timeline-client';

export function LiveDataStatus() {
  const timelineQuery = useQuery({
    queryKey: ['caratTimeline'],
    queryFn: fetchTimeline,
    staleTime: 5 * 60 * 1000
  });

  if (!timelineQuery.data) return null;

  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"
      title={`${timelineQuery.data.events.length.toLocaleString()} timeline events loaded`}
    >
      <span
        className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
        aria-hidden="true"
      />
      Live timeline
    </span>
  );
}
