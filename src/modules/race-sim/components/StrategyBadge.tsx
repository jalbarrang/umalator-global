import type { IStrategyName } from '@/lib/sunday-tools/runner/definitions';
import { cn } from '@/lib/utils';

export const strategyBadgeClassByName: Record<IStrategyName, string> = {
  'Front Runner': 'bg-amber-500/20 text-amber-500 border-amber-500/40',
  'Pace Chaser': 'bg-blue-500/20 text-blue-500 border-blue-500/40',
  'Late Surger': 'bg-purple-500/20 text-purple-500 border-purple-500/40',
  'End Closer': 'bg-red-500/20 text-red-500 border-red-500/40',
  Runaway: 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40',
};

type StrategyBadgeProps = {
  strategy: IStrategyName;
  className?: string;
};

export function StrategyBadge({ strategy, className }: StrategyBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        strategyBadgeClassByName[strategy],
        className,
      )}
    >
      {strategy}
    </span>
  );
}
