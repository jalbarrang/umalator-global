import { StatInput } from '../StatInput';
import { getIconUrl } from '@/assets/icons';
import { useIsMobile } from '@/hooks/use-mobile';
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

const statTable = [
  { key: 'speed', label: 'Speed', icon: getIconUrl('status_00.png') },
  { key: 'stamina', label: 'Stamina', icon: getIconUrl('status_01.png') },
  { key: 'power', label: 'Power', icon: getIconUrl('status_02.png') },
  { key: 'guts', label: 'Guts', icon: getIconUrl('status_03.png') },
  { key: 'wisdom', label: 'Wisdom', icon: getIconUrl('status_04.png') },
] as const;

export const StatsTable = (props: StatsTableProps) => {
  const { value, onChange, className, ...rest } = props;

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="border-2 rounded-sm">
        {statTable.map((stat) => (
          <div key={stat.key} className="grid grid-cols-2 items-center">
            <div className="flex items-center justify-center gap-2 h-full">
              <img src={stat.icon} className="w-4 h-4" />
              <span className="text-white text-sm">{stat.label}</span>
            </div>

            <div className="flex-1 pl-2">
              <StatInput value={value[stat.key]} onChange={onChange(stat.key)} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('grid grid-cols-5 rounded-sm border-2', className)} {...rest}>
      <div className="flex items-center justify-center gap-2 bg-primary rounded-tl-sm">
        <img src={getIconUrl('status_00.png')} className="w-4 h-4" />
        <span className="text-white">Speed</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-primary">
        <img src={getIconUrl('status_01.png')} className="w-4 h-4" />
        <span className="text-white">Stamina</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-primary">
        <img src={getIconUrl('status_02.png')} className="w-4 h-4" />
        <span className="text-white">Power</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-primary">
        <img src={getIconUrl('status_03.png')} className="w-4 h-4" />
        <span className="text-white">Guts</span>
      </div>
      <div className="flex items-center justify-center gap-2 bg-primary rounded-tr-sm">
        <img src={getIconUrl('status_04.png')} className="w-4 h-4" />
        <span className="text-white">Wit</span>
      </div>

      <StatInput value={value.speed} onChange={onChange('speed')} />
      <StatInput value={value.stamina} onChange={onChange('stamina')} />
      <StatInput value={value.power} onChange={onChange('power')} />
      <StatInput value={value.guts} onChange={onChange('guts')} />
      <StatInput value={value.wisdom} onChange={onChange('wisdom')} />
    </div>
  );
};
