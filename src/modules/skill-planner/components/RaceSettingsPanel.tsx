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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-card py-2 px-4 rounded-md">
      <div className="flex items-center gap-2">
        <RacePresets className="flex items-center gap-2" />
        <SavePresetModal />
      </div>

      <Separator orientation="vertical" className="hidden md:block" />

      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Track</Label>
        <TrackSelect className="flex items-center gap-2" />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Time</Label>
        <TimeOfDaySelect />
      </div>

      <Separator orientation="vertical" className="hidden md:block" />

      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Season</Label>
        <SeasonSelect />
      </div>

      <Separator orientation="vertical" className="hidden md:block" />

      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Weather</Label>
        <WeatherSelect />
      </div>

      <Separator orientation="vertical" className="hidden md:block" />

      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium">Ground</Label>
        <GroundSelect />
      </div>
    </div>
  );
}
