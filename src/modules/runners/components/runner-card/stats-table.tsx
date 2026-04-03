import { StatInput } from '../StatInput';
import { getIconUrl } from '@/assets/icons';
import { cn } from '@/lib/utils';

export type Stats = {
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wisdom: number;
};
export type StatsKey = keyof Stats;

type StatsTableProps = {
  value: Stats;
  onChange: (stat: StatsKey) => (value: number) => void;
  className?: string;
};

export const StatsTable = (props: StatsTableProps) => {
  const { value, onChange, className, ...rest } = props;

  return (
    <div className={cn('grid grid-cols-5 rounded-sm border-2', className)} {...rest}>
      <div className="flex items-center justify-center gap-2 bg-primary rounded-tl-sm">
        <img src={getIconUrl('status_00.png')} className="w-4 h-4" />
        <span className="text-white text-xs md:text-sm">Speed</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-primary">
        <img src={getIconUrl('status_01.png')} className="w-4 h-4" />
        <span className="text-white text-xs md:text-sm">Stamina</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-primary">
        <img src={getIconUrl('status_02.png')} className="w-4 h-4" />
        <span className="text-white text-xs md:text-sm">Power</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-primary">
        <img src={getIconUrl('status_03.png')} className="w-4 h-4" />
        <span className="text-white text-xs md:text-sm">Guts</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-primary rounded-tr-sm">
        <img src={getIconUrl('status_04.png')} className="w-4 h-4" />
        <span className="text-white text-xs md:text-sm">Wit</span>
      </div>

      <StatInput value={value.speed} onChange={onChange('speed')} />
      <StatInput value={value.stamina} onChange={onChange('stamina')} />
      <StatInput value={value.power} onChange={onChange('power')} />
      <StatInput value={value.guts} onChange={onChange('guts')} />
      <StatInput value={value.wisdom} onChange={onChange('wisdom')} />
    </div>
  );
};
