import { useState } from 'react';
import { BookmarkIcon, PlusIcon } from 'lucide-react';
import { importVeteranRunner, startFreshSession } from '../skill-planner.store';
import { ImportVeteranDialog } from './ImportVeteranDialog';
import { Button } from '@/components/ui/button';

export function SkillPlannerLanding() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  return (
    <>
      <ImportVeteranDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportRunner={(runner) => importVeteranRunner(runner, true)}
      />

      <div className="flex flex-col flex-1 items-center justify-center">
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 md:max-w-xl">
          <div className="flex flex-col gap-2">
            <div className="text-lg font-medium">Skill Planner</div>

            <div className="text-sm text-muted-foreground">
              Build a runner baseline, choose the shop skills you want to test, then run the
              optimizer to compare combinations before you spend points in game.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Button size="lg" className="justify-start h-12" onClick={startFreshSession}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Start fresh
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="justify-start h-12"
              onClick={() => setImportDialogOpen(true)}
            >
              <BookmarkIcon className="mr-2 h-4 w-4" />
              Import from Veterans
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
