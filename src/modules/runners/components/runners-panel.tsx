import { useMemo, useState } from 'react';
import { Link2, Link2Off, Save } from 'lucide-react';
import { RunnerCard } from './runner-card/runner-card';
import { SaveRunnerModal } from './save-runner-modal';
import {
  copyToRunner,
  linkRunner,
  resetAllRunners,
  showRunner,
  swapWithRunner,
  syncRunnerToLibrary,
  unlinkRunner,
  useRunner,
} from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, PanelContent, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { useRunnerLibraryStore } from '@/store/runner-library.store';
import './style.css';

export const RunnersPanel = () => {
  const { runnerId, runner, updateRunner, resetRunner } = useRunner();
  const { courseId } = useSettingsStore();
  const {
    updateRunner: updateLibraryRunner,
    getRunner: getLibraryRunner,
    addRunner,
  } = useRunnerLibraryStore();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const isLinked = !!runner.linkedRunnerId;
  const linkedRunner = isLinked ? getLibraryRunner(runner.linkedRunnerId!) : null;

  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const handleCopyRunner = () => {
    if (runnerId === 'uma1') {
      copyToRunner('uma1', 'uma2');
    } else if (runnerId === 'uma2') {
      copyToRunner('uma2', 'uma1');
    }
  };

  const handleSwapRunners = () => {
    if (runnerId === 'uma1') {
      swapWithRunner('uma1', 'uma2');
    } else if (runnerId === 'uma2') {
      swapWithRunner('uma2', 'uma1');
    }
  };

  const handleSyncToLibrary = () => {
    const linkedId = syncRunnerToLibrary(runnerId);
    if (linkedId) {
      updateLibraryRunner(linkedId, runner);
    }
  };

  const handleUnlink = () => {
    unlinkRunner(runnerId);
  };

  const handleSaveToVeterans = (name: string, shouldLink: boolean) => {
    const newRunnerId = addRunner({
      ...runner,
      notes: name,
    });

    if (shouldLink) {
      linkRunner(runnerId, newRunnerId);
    }
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex justify-between items-center gap-4">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              type="button"
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                runnerId === 'uma1'
                  ? 'bg-[#2a77c5] text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
              onClick={() => showRunner('uma1')}
            >
              Uma 1
            </button>
            <button
              type="button"
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                runnerId === 'uma2'
                  ? 'bg-[#c52a2a] text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
              onClick={() => showRunner('uma2')}
            >
              Uma 2
            </button>
          </div>

          <Button
            onClick={resetAllRunners}
            title="Reset all runners to default stats and skills"
            size="sm"
          >
            Reset all runners
          </Button>
        </PanelTitle>
      </PanelHeader>

      <PanelContent className="p-0">
        {/* Library Link Indicator */}
        {isLinked && linkedRunner && (
          <div className="flex items-center justify-between gap-2 p-2 bg-muted/50 border-b">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Link2 className="w-3 h-3" />
                Linked to: {linkedRunner.notes}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button size="sm" variant="ghost" onClick={handleSyncToLibrary}>
                      <Save className="w-4 h-4" />
                    </Button>
                  }
                />
                <TooltipContent>Save changes to library</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button size="sm" variant="ghost" onClick={handleUnlink}>
                      <Link2Off className="w-4 h-4" />
                    </Button>
                  }
                />
                <TooltipContent>Unlink from library</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Save to Veterans Button */}
        {!isLinked && (
          <div className="flex items-center justify-end gap-2 p-2 bg-muted/50 border-b">
            <Button size="sm" variant="secondary" onClick={() => setSaveModalOpen(true)}>
              <Save className="w-4 h-4 mr-2" />
              Save to Veterans
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <RunnerCard
            value={runner}
            courseDistance={course.distance}
            runnerId={runnerId}
            onChange={updateRunner}
            onReset={resetRunner}
            onCopy={handleCopyRunner}
            onSwap={handleSwapRunners}
          />
        </div>
      </PanelContent>

      <SaveRunnerModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        onSave={handleSaveToVeterans}
      />
    </Panel>
  );
};
