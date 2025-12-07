import {
  copyToRunner,
  resetAllRunners,
  showRunner,
  swapWithRunner,
  useRunner,
} from '@/store/runners.store';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { useMemo } from 'react';
import { RunnerCard } from './runner-card/runner-card';
import { useSettingsStore } from '@/store/settings.store';

import './style.css';
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { SkillPickerModal } from '@/modules/skills/components/skill-list/SkillList';
import { cn } from '@/lib/utils';
import { PosKeepMode } from '@/modules/simulation/lib/RaceSolver';

export const RunnersPanel = () => {
  const { runnerId, runner, updateRunner, resetRunner } = useRunner();
  const { posKeepMode, courseId } = useSettingsStore();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const showPacerTab = posKeepMode === PosKeepMode.Virtual;

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
            {showPacerTab && (
              <button
                type="button"
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  runnerId === 'pacer'
                    ? 'bg-[#22c55e] text-white'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
                onClick={() => showRunner('pacer')}
              >
                Pacer
              </button>
            )}
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
        <SkillPickerModal />

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
    </Panel>
  );
};
