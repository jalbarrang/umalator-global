import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { removePlannedBanner, restorePlannedBanner, useCaratStore } from '@/store/carat.store';

type RemovePlannedBannerButtonProps = {
  bannerId: string;
  bannerLabel: string;
};

export function RemovePlannedBannerButton(props: RemovePlannedBannerButtonProps) {
  const { bannerId, bannerLabel } = props;

  const handleRemove = () => {
    const banner = useCaratStore
      .getState()
      .plannedBanners.find((planned) => planned.id === bannerId);
    if (!banner) return;

    removePlannedBanner(bannerId);
    toast(`Removed ${bannerLabel}`, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => restorePlannedBanner(banner)
      }
    });
  };

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      onClick={handleRemove}
      aria-label={`Remove ${bannerLabel}`}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
