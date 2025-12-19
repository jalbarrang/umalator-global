import { cn } from '@/lib/utils';
import { usePresetStore } from '@/store/race/preset.store';
import { setCourseId, setRaceParams } from '@/store/settings.store';
import { createRaceConditions } from '@/utils/races';
import dayjs from 'dayjs';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type RacePresetsProps = React.HTMLAttributes<HTMLDivElement>;

export const RacePresets = (props: RacePresetsProps) => {
  const { className, ...rest } = props;

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
    <div className={cn(className)} {...rest}>
      <Label htmlFor="preset-select">Preset:</Label>

      <Select onValueChange={handleChange}>
        <SelectTrigger id="preset-select" className="w-full">
          <SelectValue placeholder="Select a preset" />
        </SelectTrigger>
        <SelectContent>
          {Object.values(presets).map((p) => (
            <SelectItem key={p.date} value={p.date}>
              {p.name} - {dayjs(p.date).format('YYYY-MM-DD')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
