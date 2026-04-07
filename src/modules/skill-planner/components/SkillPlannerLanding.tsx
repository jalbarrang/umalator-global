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

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-lg border bg-card p-6">
        <div className="space-y-2">
          <div className="text-sm font-medium">Skill Planner</div>
          <div className="text-sm text-muted-foreground">
            Build a runner baseline, choose the shop skills you want to test, then run the optimizer
            to compare combinations before you spend points in game.
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Button size="lg" className="justify-start" onClick={startFreshSession}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Start fresh
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="justify-start"
            onClick={() => setImportDialogOpen(true)}
          >
            <BookmarkIcon className="mr-2 h-4 w-4" />
            Import from Veterans
          </Button>
        </div>
      </div>
    </>
  );
}
