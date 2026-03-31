import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Aptitude, AptitudeName } from '@/lib/sunday-tools/runner/definitions';

type AptitudeSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export const AptitudeSelect = (props: AptitudeSelectProps) => {
  const { value, onChange } = props;

  const handleChange = (newValue: string | null) => {
    if (!newValue) {
      return;
    }

    onChange(newValue);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="border-none rounded-none shadow-none">
        <SelectValue>
          {(value) => <AptitudeIcon aptitude={value} className="w-4 h-4" />}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        {Object.values(AptitudeName).map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

type AptitudeIconProps = {
  aptitude: string;
  className?: string;
};

export function AptitudeIcon({ aptitude, className }: AptitudeIconProps) {
  const idx = 7 - Aptitude[aptitude as keyof typeof Aptitude];

  return (
      <img
        src={`/icons/utx_ico_statusrank_${(100 + idx).toString().slice(1)}.png`}
        className={className}
      />
  );
}
