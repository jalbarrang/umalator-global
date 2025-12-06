import { cn } from '@/lib/utils';
import { Activity } from 'react';

export type TooltipData = {
  v1Text: string;
  v2Text: string;
  vpText?: string;
  pd1Text?: string;
  pd2Text?: string;
};

type RaceTrackTooltipProps = {
  data: TooltipData | null;
  className?: string;
  visible: boolean;
};

export const RaceTrackTooltip: React.FC<RaceTrackTooltipProps> = ({
  data,
  className,
  visible,
}) => {
  if (!data) {
    return null;
  }

  if (!visible) {
    return (
      <div
        className={cn(
          'border rounded-lg p-2 text-sm font-mono h-[62px] w-[350px]',
          className,
        )}
      >
        <div className="flex flex-col gap-1"></div>
      </div>
    );
  }

  return (
    <div className={cn('border rounded-lg p-2 text-sm font-mono', className)}>
      <div className="flex flex-col gap-1">
        <Activity mode={data.v1Text ? 'visible' : 'hidden'}>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: '#2a77c5' }}>
              {data.v1Text}
            </span>
          </div>
        </Activity>

        <Activity mode={data.v2Text ? 'visible' : 'hidden'}>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: '#c52a2a' }}>
              {data.v2Text}
            </span>
          </div>
        </Activity>

        <Activity mode={data.vpText ? 'visible' : 'hidden'}>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: '#22c55e' }}>
              {data.vpText}
            </span>
          </div>
        </Activity>

        <Activity mode={data.pd1Text ? 'visible' : 'hidden'}>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: '#2a77c5' }}>
              {data.pd1Text}
            </span>
          </div>
        </Activity>

        <Activity mode={data.pd2Text ? 'visible' : 'hidden'}>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: '#c52a2a' }}>
              {data.pd2Text}
            </span>
          </div>
        </Activity>
      </div>
    </div>
  );
};
