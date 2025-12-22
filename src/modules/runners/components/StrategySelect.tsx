import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
        <SelectItem value="Oonige">Runaway</SelectItem>
        <SelectItem value="Nige">Front Runner</SelectItem>
        <SelectItem value="Senkou">Pace Chaser</SelectItem>
        <SelectItem value="Sasi">Late Surger</SelectItem>
        <SelectItem value="Oikomi">End Closer</SelectItem>
      </SelectContent>
    </Select>
  );
}
