import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { AddBannerDialog } from '@/modules/carat/components/add-banner-dialog';
import { fetchTimeline } from '@/modules/carat/data/timeline-client';

export function AddBannerButton() {
  const timelineQuery = useQuery({
    queryKey: ['caratTimeline'],
    queryFn: fetchTimeline,
    staleTime: 5 * 60 * 1000
  });

  if (!timelineQuery.data) {
    return (
      <Button data-tutorial="carat-add-banner" disabled>
        + Add banner from timeline
      </Button>
    );
  }

  return <AddBannerDialog timeline={timelineQuery.data} />;
}
