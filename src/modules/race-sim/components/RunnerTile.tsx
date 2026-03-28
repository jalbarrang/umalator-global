import { useMemo } from 'react';
import type { KeyboardEvent } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { strategyNames } from '@/lib/sunday-tools/runner/definitions';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { getUmaDisplayInfo, getUmaImageUrl } from '@/modules/runners/utils';
import { StatImage } from '@/modules/runners/components/StatInput';

type RunnerTileProps = {
  index: number;
  runner: RunnerState;
  isFocused: boolean;
  onToggleFocus: (index: number) => void;
  onOpenEditor?: (index: number) => void;
};

export function RunnerTile({
  index,
  runner,
  isFocused,
  onToggleFocus,
  onOpenEditor,
}: RunnerTileProps) {
  const imageUrl = useMemo(
    () => getUmaImageUrl(runner.outfitId, runner.randomMobId),
    [runner.outfitId, runner.randomMobId],
  );

  const umaInfo = useMemo(() => {
    if (!runner.outfitId) return null;
    return getUmaDisplayInfo(runner.outfitId);
  }, [runner.outfitId]);

  const handleOpenEditor = () => {
    onOpenEditor?.(index);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onOpenEditor) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenEditor(index);
    }
  };

  return (
    <div
      role={onOpenEditor ? 'button' : undefined}
      tabIndex={onOpenEditor ? 0 : -1}
      aria-label={onOpenEditor ? `Open editor for runner ${index + 1}` : undefined}
      className={cn(
        'relative rounded-lg border bg-card transition-shadow hover:shadow-lg',
        onOpenEditor && 'cursor-pointer hover:border-primary/40',
        isFocused && 'ring-2 ring-primary',
      )}
      onClick={handleOpenEditor}
      onKeyDown={onOpenEditor ? handleKeyDown : undefined}
    >
      <div className="flex flex-col gap-4 p-2">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <div className="w-16 h-16">
              <img
                src={imageUrl}
                alt={`Runner ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="flex flex-1 justify-between gap-2 min-w-0">
            <div className="flex flex-col flex-1 gap-2 min-w-0">
              {umaInfo && (
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">{umaInfo.outfit}</div>
                  <div className="text-sm font-semibold">{umaInfo.name}</div>
                </div>
              )}

              {!umaInfo && <div className="text-sm text-muted-foreground">Runner</div>}
            </div>

            <label
              className="flex shrink-0 items-center gap-1.5 cursor-pointer"
              onClick={(event) => event.stopPropagation()}
            >
              <Checkbox checked={isFocused} onCheckedChange={() => onToggleFocus(index)} />
              <span className="text-xs text-muted-foreground">Track</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 rounded-sm border-2">
          <div className="grid grid-cols-5">
            <div className="flex items-center justify-center gap-1 bg-primary py-1 rounded-tl-sm">
              <img src="/icons/status_00.png" className="w-3.5 h-3.5" />
              <span className="text-white text-[10px]">Spd</span>
            </div>
            <div className="flex items-center justify-center gap-1 bg-primary py-1">
              <img src="/icons/status_01.png" className="w-3.5 h-3.5" />
              <span className="text-white text-[10px]">Sta</span>
            </div>
            <div className="flex items-center justify-center gap-1 bg-primary py-1">
              <img src="/icons/status_02.png" className="w-3.5 h-3.5" />
              <span className="text-white text-[10px]">Pow</span>
            </div>
            <div className="flex items-center justify-center gap-1 bg-primary py-1">
              <img src="/icons/status_03.png" className="w-3.5 h-3.5" />
              <span className="text-white text-[10px]">Gut</span>
            </div>
            <div className="flex items-center justify-center gap-1 bg-primary py-1 rounded-tr-sm">
              <img src="/icons/status_04.png" className="w-3.5 h-3.5" />
              <span className="text-white text-[10px]">Wit</span>
            </div>
          </div>

          <div className="grid grid-cols-5">
            {[runner.speed, runner.stamina, runner.power, runner.guts, runner.wisdom].map(
              (stat, i) => (
                <div key={i} className="flex items-center gap-1 p-1">
                  <StatImage value={stat} className="w-3.5 h-3.5" />
                  <span className="text-xs">{stat}</span>
                </div>
              ),
            )}
          </div>
        </div>

        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Strategy:</span>
            <span className="font-medium">
              {strategyNames.find((name) => name === runner.strategy) ?? 'Unknown'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Skills:</span>
            <span className="font-medium">{runner.skills.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
