import { SavedRunner } from '@/store/runner-library.store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Copy, Edit, MoreVertical, PlayCircle, Trash2 } from 'lucide-react';
import { getUmaDisplayInfo, getUmaImageUrl } from '../utils';
import { STRATEGY_LABELS } from '../constants';
import { useMemo } from 'react';
import { StatImage } from './StatInput';

type SavedRunnerCardProps = {
  runner: SavedRunner;
  onEdit: (runner: SavedRunner) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onLoadToSimulation: (runner: SavedRunner) => void;
};

export const SavedRunnerCard = (props: SavedRunnerCardProps) => {
  const { runner, onEdit, onDelete, onDuplicate, onLoadToSimulation } = props;

  const umaInfo = useMemo(() => {
    if (!runner.outfitId) return null;
    return getUmaDisplayInfo(runner.outfitId);
  }, [runner.outfitId]);

  const imageUrl = useMemo(() => {
    return getUmaImageUrl(runner.outfitId, runner.randomMobId);
  }, [runner.outfitId, runner.randomMobId]);

  return (
    <div className="transition-shadow hover:shadow-lg rounded-lg border bg-card">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-4">
          {/* Uma Portrait */}
          <div className="shrink">
            <div className="w-24 h-24">
              <img src={imageUrl} alt={runner.notes} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="flex flex-1 justify-between gap-2">
            <div className="flex flex-col flex-1 gap-2 min-w-0">
              {umaInfo && (
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">{umaInfo.outfit}</div>
                  <div className="text-sm font-semibold">{umaInfo.name}</div>
                </div>
              )}

              <div className="text-sm truncate">
                <span className="text-muted-foreground">Notes:</span> {runner.notes ?? 'No notes'}
              </div>
            </div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onLoadToSimulation(runner)}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Load to Simulation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(runner)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicate(runner.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(runner.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Runner Info */}
          <div className="flex flex-col flex-1 min-w-0 gap-2">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 rounded-sm border-2">
              <div className="grid grid-cols-5">
                <div className="flex items-center justify-center gap-2 bg-primary rounded-tl-sm">
                  <img src="/icons/status_00.png" className="w-4 h-4" />
                  <span className="text-white text-xs md:text-sm">Speed</span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-primary">
                  <img src="/icons/status_01.png" className="w-4 h-4" />
                  <span className="text-white text-xs md:text-sm">Stamina</span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-primary">
                  <img src="/icons/status_02.png" className="w-4 h-4" />
                  <span className="text-white text-xs md:text-sm">Power</span>
                </div>

                <div className="flex items-center justify-center gap-2 bg-primary">
                  <img src="/icons/status_03.png" className="w-4 h-4" />
                  <span className="text-white text-xs md:text-sm">Guts</span>
                </div>

                <div className="flex items-center justify-center gap-2 bg-primary rounded-tr-sm">
                  <img src="/icons/status_04.png" className="w-4 h-4" />
                  <span className="text-white text-xs md:text-sm">Wit</span>
                </div>
              </div>

              <div className="grid grid-cols-5">
                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.speed} className="w-4 h-4" />
                  </div>
                  <span className="p-1">{runner.speed}</span>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.stamina} className="w-4 h-4" />
                  </div>
                  <span className="p-1">{runner.stamina}</span>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.power} className="w-4 h-4" />
                  </div>
                  <span className="p-1">{runner.power}</span>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.guts} className="w-4 h-4" />
                  </div>
                  <span className="p-1">{runner.guts}</span>
                </div>

                <div className="flex items-center">
                  <div className="flex items-center justify-center p-1">
                    <StatImage value={runner.wisdom} className="w-4 h-4" />
                  </div>
                  <span className="p-1">{runner.wisdom}</span>
                </div>
              </div>
            </div>

            {/* Strategy & Skills Count */}
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Strategy: </span>
                <span className="font-medium">
                  {STRATEGY_LABELS[runner.strategy] ?? runner.strategy}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Skills: </span>
                <span className="font-medium">{runner.skills.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
