import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { IGroundCondition } from '@/lib/sunday-tools/course/definitions';
import { setRaceParams, useSettingsStore } from '@/store/settings.store';

const groundConditions = {
  '1': 'Firm',
  '2': 'Good',
  '3': 'Soft',
  '4': 'Heavy',
} as const;

export const GroundSelect = () => {
  const { racedef } = useSettingsStore();

  const handleChangeGround = (value: string | null) => {
    if (!value) {
      return;
    }

    setRaceParams({ ...racedef, ground: +value as IGroundCondition });
  };

  return (
    <Select value={racedef.ground.toString()} onValueChange={handleChangeGround}>
      <SelectTrigger className="w-full">
        <SelectValue
          render={(_, value) => {
            if (value.value) {
              return <span>{groundConditions[value.value as keyof typeof groundConditions]}</span>;
            }

            return <span className="text-muted-foreground">Ground condition</span>;
          }}
        />
      </SelectTrigger>

      <SelectContent>
        {Object.entries(groundConditions).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
