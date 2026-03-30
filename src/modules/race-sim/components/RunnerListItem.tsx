import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { strategyNames } from '@/lib/sunday-tools/runner/definitions';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { getUmaDisplayInfo, getUmaImageUrl } from '@/modules/runners/utils';

type RunnerListItemProps = {
  index: number;
  runner: RunnerState;
  isSelected: boolean;
  isFocused: boolean;
  onSelect: (index: number) => void;
  onToggleFocus: (index: number) => void;
};

const statIcons = [
  '/icons/status_00.png',
  '/icons/status_01.png',
  '/icons/status_02.png',
  '/icons/status_03.png',
  '/icons/status_04.png',
] as const;

export function RunnerListItem({
  index,
  runner,
  isSelected,
  isFocused,
  onSelect,
  onToggleFocus,
}: RunnerListItemProps) {
  const imageUrl = useMemo(
    () => getUmaImageUrl(runner.outfitId, runner.randomMobId),
    [runner.outfitId, runner.randomMobId],
  );

  const umaInfo = useMemo(() => {
    if (!runner.outfitId) return null;
    return getUmaDisplayInfo(runner.outfitId);
  }, [runner.outfitId]);

  const stats = [runner.speed, runner.stamina, runner.power, runner.guts, runner.wisdom];

  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-lg p-2.5 text-left transition-all duration-150',
        'hover:bg-accent/60',
        isSelected
          ? 'bg-card shadow-sm ring-1 ring-primary/30'
          : 'bg-transparent',
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-primary" />
      )}

      <div className="relative shrink-0">
        <img
          src={imageUrl}
          alt={umaInfo?.name ?? `Runner ${index + 1}`}
          className={cn(
            'size-12 rounded-md object-cover ring-1 ring-border transition-all',
            isSelected && 'ring-primary/50',
          )}
        />
        <div
          className={cn(
            'absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
            'bg-muted text-muted-foreground ring-1 ring-border',
            isSelected && 'bg-primary text-primary-foreground ring-primary',
          )}
        >
          {index + 1}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            {umaInfo ? (
              <>
                <div className="text-xs font-semibold truncate leading-tight">
                  {umaInfo.name}
                </div>
                <div className="text-[10px] text-muted-foreground truncate leading-tight">
                  {umaInfo.outfit}
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">
                Mob Runner
              </div>
            )}
          </div>

          <label
            className="shrink-0 cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isFocused}
              onCheckedChange={() => onToggleFocus(index)}
              className="size-3.5"
            />
          </label>
        </div>

        <div className="flex items-center gap-0.5">
          {stats.map((stat, i) => (
            <div
              key={i}
              className="flex items-center gap-px"
              title={['Spd', 'Sta', 'Pow', 'Gut', 'Wit'][i]}
            >
              <img src={statIcons[i]} className="size-3 opacity-70" />
              <span className="text-[10px] tabular-nums text-muted-foreground">{stat}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] rounded bg-secondary px-1 py-px font-medium text-secondary-foreground">
            {strategyNames.find((name) => name === runner.strategy) ?? 'Unknown'}
          </span>
          {runner.skills.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {runner.skills.length} skill{runner.skills.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
