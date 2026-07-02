import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { getIconUrl } from '@/assets/icons';
import { Aptitude, AptitudeName } from '@/lib/uma-domain/runner/definitions';

import { cn } from '@/lib/utils';

type AptitudeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  size?: 'sm' | 'default';
  iconClassName?: string;
};

export const AptitudeSelect = (props: AptitudeSelectProps) => {
  const { value, onChange, className, size = 'default', iconClassName = 'size-4' } = props;

  const handleChange = (newValue: string | null) => {
    if (!newValue) {
      return;
    }

    onChange(newValue);
  };

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger
        size={size}
        className={cn('border-none rounded-none shadow-none w-full', className)}
      >
        <SelectValue>
          {(value) => <AptitudeIcon aptitude={value} className={iconClassName} />}
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

function AptitudeIcon({ aptitude, className }: AptitudeIconProps) {
  const idx = 7 - Aptitude[aptitude as keyof typeof Aptitude];

  return (
    <img
      src={getIconUrl(`utx_ico_statusrank_${(100 + idx).toString().slice(1)}.png`)}
      alt={`${aptitude} aptitude`}
      className={className}
    />
  );
}
