import { setRaceParams, useSettingsStore } from '@/store/settings.store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const groundConditions = {
  '1': 'Firm',
  '2': 'Good',
  '3': 'Soft',
  '4': 'Heavy',
} as const;

type GroundCondition = keyof typeof groundConditions;

export const GroundSelect = () => {
  const { racedef } = useSettingsStore();

  const handleChangeGround = (value: GroundCondition) => {
    setRaceParams({ ...racedef, ground: +value });
  };

  return (
    <Select
      value={racedef.ground.toString()}
      onValueChange={handleChangeGround}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
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
