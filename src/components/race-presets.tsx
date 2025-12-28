import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '@/lib/utils';
import { usePresetStore } from '@/store/race/preset.store';
import {
  setCourseId,
  setRaceParams,
  setSelectedPresetId,
  useSettingsStore,
} from '@/store/settings.store';
import { createRaceConditions } from '@/utils/races';

type RacePresetsProps = React.HTMLAttributes<HTMLDivElement>;

export const RacePresets = (props: RacePresetsProps) => {
  const { className, ...rest } = props;

  const { presets } = usePresetStore();
  const selectedPresetId = useSettingsStore((state) => state.selectedPresetId);

  const handleChange = (value: string | null) => {
    if (!value) {
      return;
    }

    const preset = presets[value];
    setCourseId(preset.courseId);
    setRaceParams(
      createRaceConditions({
        ground: preset.ground,
        weather: preset.weather,
        season: preset.season,
        time: preset.time,
      }),
    );
    setSelectedPresetId(value);
  };

  return (
    <div className={cn(className)} {...rest}>
      <Label htmlFor="preset-select">Preset:</Label>

      <Select value={selectedPresetId} onValueChange={handleChange}>
        <SelectTrigger id="preset-select" className="w-full">
          <SelectValue
            render={(_, value) => {
              if (value.value) {
                return <span>{presets[value.value].name}</span>;
              }

              return <span className="text-muted-foreground">Select a preset</span>;
            }}
          />
        </SelectTrigger>

        <SelectContent>
          {Object.values(presets).map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
