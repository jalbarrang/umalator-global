import { GroundSelect } from '@/components/race-settings/GroundSelect';
import { SeasonSelect } from '@/components/race-settings/SeasonSelect';
import { WeatherSelect } from '@/components/race-settings/WeatherSelect';
import { TimeOfDaySelect } from '@/components/race-settings/TimeOfDaySelect';
import { TrackSelect } from './track-select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDownIcon } from 'lucide-react';
import { useSettingsStore } from '@/store/settings.store';
import { addPreset } from '@/store/race/preset.store';
import { EventType } from '@/utils/races';
import { toast } from 'sonner';
import { RacePresets } from '@/components/race-presets';
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from '@/components/ui/panel';

export const RacetrackSettings = () => {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);

  const handleSaveAsPreset = () => {
    const { courseId, racedef } = useSettingsStore.getState();

    if (!date) {
      toast.error('Please select a date');
      return;
    }

    addPreset({
      type: EventType.CM,
      date: dayjs(date).format('YYYY-MM-DD'),
      courseId,
      ground: racedef.ground,
      weather: racedef.weather,
      season: racedef.season,
      time: racedef.time,
    });

    toast.success('Preset saved!');
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>Race Settings</PanelTitle>
      </PanelHeader>

      <PanelContent className="flex flex-col gap-4">
        <RacePresets />

        <div className="flex flex-col gap-2">
          <Label>Track</Label>
          <TrackSelect />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Time of Day</Label>
          <TimeOfDaySelect />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Ground Conditions</Label>
          <GroundSelect />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Weather</Label>
          <WeatherSelect />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Season</Label>
          <SeasonSelect />
        </div>

        <div className="flex items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                id="date"
                className="flex-1 justify-between font-normal"
              >
                {date ? date.toLocaleDateString() : 'Select date'}
                <ChevronDownIcon />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto overflow-hidden p-0"
              align="start"
            >
              <Calendar
                mode="single"
                selected={date}
                captionLayout="dropdown"
                onSelect={(date) => {
                  setDate(date);
                  setOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" onClick={handleSaveAsPreset}>
            Save as Preset
          </Button>
        </div>
      </PanelContent>
    </Panel>
  );
};
