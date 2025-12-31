import { GroundSelect } from '@/components/race-settings/GroundSelect';
import { SeasonSelect } from '@/components/race-settings/SeasonSelect';
import { TimeOfDaySelect } from '@/components/race-settings/TimeOfDaySelect';
import { WeatherSelect } from '@/components/race-settings/WeatherSelect';
import { RacePresets } from '@/components/race-presets';
import { SavePresetModal } from '@/components/save-preset-modal';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TrackSelect } from '@/modules/racetrack/components/track-select';

export function RaceSettingsPanel() {
  return (
    <div className="flex flex-col gap-4 bg-secondary p-4 rounded-md">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-end md:items-center gap-2">
          <RacePresets className="flex flex-col md:flex-row md:items-center gap-2" />
          <SavePresetModal />
        </div>

        <Separator orientation="vertical" className="hidden md:block" />

        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <Label className="text-xs font-medium">Track</Label>
          <TrackSelect className="flex flex-col md:flex-row md:items-center gap-2" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Time of Day</Label>
            <TimeOfDaySelect />
          </div>

          <Separator orientation="vertical" className="hidden md:block" />

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Season</Label>
            <SeasonSelect />
          </div>

          <Separator orientation="vertical" className="hidden md:block" />

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Weather</Label>
            <WeatherSelect />
          </div>

          <Separator orientation="vertical" className="hidden md:block" />

          <div className="flex flex-col gap-2">
            <Label className="text-xs font-medium">Ground</Label>
            <GroundSelect />
          </div>
        </div>
      </div>
    </div>
  );
}
