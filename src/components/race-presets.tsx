import { setCourseId, setRaceParams } from '@/store/settings.store';
import { createRaceConditions, EventType } from '@/utils/races';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { usePresetStore } from '@/store/race/preset.store';
import dayjs from 'dayjs';

export const RacePresets = () => {
  const { presets } = usePresetStore();

  const handleChange = (value: string) => {
    setCourseId(presets[value].courseId);
    setRaceParams(
      createRaceConditions({
        ground: presets[value].ground,
        weather: presets[value].weather,
        season: presets[value].season,
        time: presets[value].time,
      }),
    );
  };

  return (
    <div className="flex items-center gap-3">
      <Label htmlFor="preset-select">Preset:</Label>

      <Select onValueChange={handleChange}>
        <SelectTrigger id="preset-select" className="w-full">
          <SelectValue placeholder="Track Preset" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(presets).map((p) => (
            <SelectItem key={p.date} value={p.date}>
              {dayjs(p.date).format('YYYY-MM-DD')}&nbsp;
              {p.type === EventType.CM ? 'CM' : 'LOH'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
