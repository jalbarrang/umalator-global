import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  toggleShowHp,
  toggleShowLanes,
  toggleShowThresholds,
  toggleShowUma1,
  toggleShowUma2,
} from '@/store/settings.store';
import { useRaceTrack } from '../context/RaceTrackContext';

export const TrackControls = () => {
  const { showHp, showLanes, showThresholds, showUma1, showUma2 } = useRaceTrack();

  return (
    <div className="flex flex-col md:flex-row gap-4 bg-card text-xs px-4 py-2 rounded-md">
      <div className="flex items-center gap-2">
        <Checkbox id="showhp" checked={showHp} onCheckedChange={toggleShowHp} />
        <Label htmlFor="showhp" className="text-sm font-normal cursor-pointer">
          Show HP
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="showlanes" checked={showLanes} onCheckedChange={toggleShowLanes} />
        <Label htmlFor="showlanes" className="text-sm font-normal cursor-pointer">
          Show Lanes
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="showthresholds"
          checked={showThresholds}
          onCheckedChange={toggleShowThresholds}
        />
        <Label htmlFor="showthresholds" className="text-sm font-normal cursor-pointer">
          Show thresholds
        </Label>
      </div>

      <Separator orientation="vertical" className="hidden md:block" />

      <div className="flex items-center gap-2">
        <Checkbox id="show-uma1" checked={showUma1} onCheckedChange={toggleShowUma1} />
        <Label htmlFor="show-uma1" className="text-sm font-normal cursor-pointer">
          Show Uma 1
        </Label>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="show-uma2" checked={showUma2} onCheckedChange={toggleShowUma2} />
        <Label htmlFor="show-uma2" className="text-sm font-normal cursor-pointer">
          Show Uma 2
        </Label>
      </div>
    </div>
  );
};
