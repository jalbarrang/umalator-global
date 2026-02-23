import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { strategyNames } from '@/lib/sunday-tools/runner/definitions';

type StrategySelectProps = {
  value: string;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export function StrategySelect(props: StrategySelectProps) {
  const { value, onChange, disabled = false } = props;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="border-none rounded-none shadow-none">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {strategyNames.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
