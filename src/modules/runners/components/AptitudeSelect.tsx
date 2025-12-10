import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Aptitude } from '@/modules/simulation/lib/HorseTypes';

type AptitudeSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export const AptitudeSelect = (props: AptitudeSelectProps) => {
  const { value, onChange } = props;

  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <Select value={value.toString()} onValueChange={handleChange}>
      <SelectTrigger className="border-none rounded-none shadow-none">
        <AptitudeIcon aptitude={value} className="w-4 h-4" />
      </SelectTrigger>

      <SelectContent>
        {Object.keys(Aptitude).map((key) => (
          <SelectItem key={key} value={key}>
            <AptitudeIcon aptitude={key} className="w-4 h-4" />
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

export function AptitudeIcon(props: AptitudeIconProps) {
  const idx = 7 - Aptitude[props.aptitude as keyof typeof Aptitude];

  return (
    <img
      src={`/icons/utx_ico_statusrank_${(100 + idx).toString().slice(1)}.png`}
      className={props.className}
    />
  );
}
