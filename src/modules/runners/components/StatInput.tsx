import { Input } from '@/components/ui/input';
import { rankForStat } from '@/modules/runners/utils';
import { useEffect, useState } from 'react';

type StatImageProps = React.HTMLAttributes<HTMLImageElement> & {
  value: number;
};

export const StatImage = (props: StatImageProps) => {
  const { value, ...rest } = props;

  const rank = rankForStat(value);

  const iconId = (100 + rank).toString().slice(1);

  return (
    <img src={`/icons/statusrank/ui_statusrank_${iconId}.png`} {...rest} />
  );
};

type StatInputProps = {
  value: number;
  onChange: (value: number) => void;
};

export const StatInput = (props: StatInputProps) => {
  const { value, onChange } = props;

  const [innerValue, setInnerValue] = useState(value);

  useEffect(() => {
    setInnerValue(value);
  }, [value]);

  return (
    <div className="flex items-center">
      <div className="flex items-center justify-center p-1">
        <StatImage value={innerValue} className="w-4 h-4" />
      </div>

      <Input
        className="flex-1 border-none rounded-none p-1 text-sm"
        type="number"
        min="1"
        max="1200" // TODO: Update this to a new threshold when we have it
        value={innerValue}
        onInput={(e) => setInnerValue(+e.currentTarget.value)}
        onBlur={() => onChange(innerValue)}
      />
    </div>
  );
};
