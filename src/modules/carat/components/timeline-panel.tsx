import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { BannerPlanTable } from '@/modules/carat/components/banner-plan-table';
import { SelectorPlanner } from '@/modules/carat/components/selector-planner';
import { fetchTimeline } from '@/modules/carat/data/timeline-client';

type TimelinePanelProps = {
  mode: 'calculator' | 'selector';
};

export function TimelinePanel(props: TimelinePanelProps) {
  const { mode } = props;
  const timelineQuery = useQuery({
    queryKey: ['caratTimeline'],
    queryFn: fetchTimeline,
    staleTime: 5 * 60 * 1000
  });

  if (timelineQuery.isPending) {
    return (
      <div className="rounded-lg bg-muted/60 p-4 text-sm text-muted-foreground">
        Loading timeline…
      </div>
    );
  }

  if (timelineQuery.isError) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-destructive">Couldn’t load the banner timeline.</div>
          <p className="mt-0.5 text-muted-foreground">
            Check your connection and try again — your income settings are saved.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => timelineQuery.refetch()}
          disabled={timelineQuery.isFetching}
        >
          {timelineQuery.isFetching ? 'Retrying…' : 'Retry'}
        </Button>
      </div>
    );
  }

  return mode === 'calculator' ? (
    <BannerPlanTable timeline={timelineQuery.data} />
  ) : (
    <SelectorPlanner timeline={timelineQuery.data} />
  );
}
