import { Edit, PlayCircle, Code, Download, Camera, Share } from 'lucide-react';
import { memo, useMemo, useRef } from 'react';
import { getUmaDisplayInfo, getUmaImageUrl } from '../utils';
import { StatImage } from './StatInput';
import type { ISavedRunner } from '@/store/runner-library.store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { strategyNames } from 'sunday-tools/runner/definitions';
import { getIconUrl } from '@/assets/icons';
import {
  copyRosterViewCode,
  copyScreenshot,
  downloadJson,
  getSkillsForShareCard
} from '../share/share-actions';
import { ShareCard } from '../share/share-card';
import { Checkbox } from '@/components/ui/checkbox';

type SavedRunnerCardProps = {
  runner: ISavedRunner;
  onEdit: (runner: ISavedRunner) => void;
  onDuplicate: (id: string) => void;
  onLoadToSimulation: (runner: ISavedRunner) => void;

  // Selection grid
  selected?: boolean;
  onToggleSelect?: () => void;
};

export const SavedRunnerCard = memo((props: SavedRunnerCardProps) => {
  const { runner, onEdit, onLoadToSimulation } = props;

  const umaInfo = useMemo(() => {
    if (!runner.outfitId) return null;
    return getUmaDisplayInfo(runner.outfitId);
  }, [runner.outfitId]);

  const imageUrl = useMemo(() => {
    return getUmaImageUrl(runner.outfitId, runner.randomMobId);
  }, [runner.outfitId, runner.randomMobId]);

  const shareCardRef = useRef<HTMLDivElement>(null);

  const shareSkills = useMemo(() => {
    return getSkillsForShareCard(runner.skills);
  }, [runner.skills]);

  const runnerStrategy = useMemo(() => {
    return strategyNames.find((name) => name === runner.strategy) ?? 'Unknown';
  }, [runner.strategy]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-col gap-4 p-2">
        <div className="flex gap-4">
          {/* Uma Portrait */}
          <div className="shrink">
            <div className="size-18">
              <img src={imageUrl} alt={runner.notes} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex flex-1 justify-between gap-2">
            <div className="flex flex-col flex-1 gap-2 min-w-0">
              {umaInfo && (
                <div>
                  <div className="text-xs text-muted-foreground">{umaInfo.outfit}</div>
                  <div className="text-sm font-semibold">{umaInfo.name}</div>
                </div>
              )}

              <div className="text-xs text-muted-foreground truncate">
                {runner.notes ?? 'No notes'}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center">
                <Button variant="ghost" size="icon-sm" onClick={() => onLoadToSimulation(runner)}>
                  <PlayCircle />
                </Button>

                <Button variant="ghost" size="icon-sm" onClick={() => onEdit(runner)}>
                  <Edit />
                </Button>

                {/* Actions Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm">
                        <Share />
                      </Button>
                    }
                  />

                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => copyRosterViewCode(runner, runner.createdAt)}>
                      <Code className="size-4 mr-2" />
                      Copy RosterView Code
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        downloadJson(
                          runner,
                          `runner-${umaInfo?.name ?? 'unknown'}.json`,
                          runner.createdAt
                        )
                      }
                    >
                      <Download className="size-4 mr-2" />
                      Download JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        if (shareCardRef.current) copyScreenshot(shareCardRef.current);
                      }}
                    >
                      <Camera className="size-4 mr-2" />
                      Copy Screenshot
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Checkbox
                  checked={props.selected}
                  onCheckedChange={props.onToggleSelect}
                  className="ml-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Runner Info */}
          <div className="flex flex-col flex-1 min-w-0 gap-2">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 rounded-sm border-2">
              <div className="grid grid-cols-5">
                <div className="flex items-center justify-center gap-2 bg-primary rounded-tl-sm">
                  <img src={getIconUrl('status_00.png')} alt="" className="size-4" />
                  <span className="text-white text-xs">Speed</span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-primary">
                  <img src={getIconUrl('status_01.png')} alt="" className="size-4" />
                  <span className="text-white text-xs">Stamina</span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-primary">
                  <img src={getIconUrl('status_02.png')} alt="" className="size-4" />
                  <span className="text-white text-xs">Power</span>
                </div>

                <div className="flex items-center justify-center gap-2 bg-primary">
                  <img src={getIconUrl('status_03.png')} alt="" className="size-4" />
                  <span className="text-white text-xs">Guts</span>
                </div>

                <div className="flex items-center justify-center gap-2 bg-primary rounded-tr-sm">
                  <img src={getIconUrl('status_04.png')} alt="" className="size-4" />
                  <span className="text-white text-xs">Wit</span>
                </div>
              </div>

              <div className="grid grid-cols-5">
                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.speed} className="size-4" />
                  </div>
                  <span className="p-1 text-sm font-mono">{runner.speed}</span>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.stamina} className="size-4" />
                  </div>
                  <span className="p-1 text-sm font-mono">{runner.stamina}</span>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.power} className="size-4" />
                  </div>
                  <span className="p-1 text-sm font-mono">{runner.power}</span>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.guts} className="size-4" />
                  </div>
                  <span className="p-1 text-sm font-mono">{runner.guts}</span>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.wisdom} className="size-4" />
                  </div>
                  <span className="p-1 text-sm font-mono">{runner.wisdom}</span>
                </div>
              </div>
            </div>

            {/* Strategy & Skills Count */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Strategy: </span>
                <span className="font-medium">{runnerStrategy}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Skills: </span>
                <span className="font-medium">{runner.skills.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: -9999, top: 0 }}>
        <ShareCard
          ref={shareCardRef}
          runner={runner}
          umaInfo={umaInfo}
          imageUrl={imageUrl}
          skills={shareSkills}
        />
      </div>
    </div>
  );
});
