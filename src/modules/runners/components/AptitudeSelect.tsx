import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { APTITUDES } from '@/modules/runners/constants';

type AptitudeSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

export const AptitudeSelect = (props: AptitudeSelectProps) => {
  return (
    <Select value={props.value} onValueChange={props.onChange}>
      <SelectTrigger className="border-none rounded-none shadow-none">
        <AptitudeIcon aptitude={props.value} className="w-4 h-4" />
      </SelectTrigger>

      <SelectContent>
        {APTITUDES.map((aptitude) => (
          <SelectItem key={aptitude} value={aptitude}>
            <AptitudeIcon aptitude={aptitude} className="w-4 h-4" />
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
  const idx = 7 - APTITUDES.indexOf(props.aptitude);

  return (
    <img
      src={`/icons/utx_ico_statusrank_${(100 + idx).toString().slice(1)}.png`}
      className={props.className}
    />
  );
}
