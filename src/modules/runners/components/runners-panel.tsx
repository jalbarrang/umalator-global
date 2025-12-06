import {
  copyUmaToLeft,
  copyUmaToRight,
  resetAllUmas,
  resetPacer,
  resetUma1,
  resetUma2,
  setPacer,
  setUma1,
  setUma2,
  swapUmas,
  useRunnersStore,
} from '@/store/runners.store';
import { setChartTargetUma, useUIStore } from '@/store/ui.store';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
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

export const RunnersPanel = () => {
  const { chartTargetUma } = useUIStore();
  const { uma1, uma2, pacer } = useRunnersStore();
  const { posKeepMode, courseId } = useSettingsStore();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const showPacerTab = posKeepMode === PosKeepMode.Virtual;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex justify-between items-center">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              type="button"
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                chartTargetUma === 'uma1'
                  ? 'bg-[#2a77c5] text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
              onClick={() => setChartTargetUma('uma1')}
            >
              Uma 1
            </button>
            <button
              type="button"
              className={cn(
                'px-3 py-1.5 text-sm font-medium transition-colors',
                chartTargetUma === 'uma2'
                  ? 'bg-[#c52a2a] text-white'
                  : 'bg-background text-muted-foreground hover:bg-muted',
              )}
              onClick={() => setChartTargetUma('uma2')}
            >
              Uma 2
            </button>
            {showPacerTab && (
              <button
                type="button"
                className={cn(
                  'px-3 py-1.5 text-sm font-medium transition-colors',
                  chartTargetUma === 'pacer'
                    ? 'bg-[#22c55e] text-white'
                    : 'bg-background text-muted-foreground hover:bg-muted',
                )}
                onClick={() => setChartTargetUma('pacer')}
              >
                Pacer
              </button>
            )}
          </div>

          <Button
            onClick={resetAllUmas}
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
          {chartTargetUma === 'uma1' && (
            <RunnerCard
              value={uma1}
              onChange={setUma1}
              onReset={resetUma1}
              courseDistance={course.distance}
              runnerType="uma1"
              onCopy={copyUmaToRight}
              onSwap={swapUmas}
            />
          )}

          {chartTargetUma === 'uma2' && (
            <RunnerCard
              value={uma2}
              onChange={setUma2}
              onReset={resetUma2}
              courseDistance={course.distance}
              runnerType="uma2"
              onCopy={copyUmaToLeft}
              onSwap={swapUmas}
            />
          )}

          {chartTargetUma === 'pacer' && showPacerTab && (
            <RunnerCard
              value={pacer}
              onChange={setPacer}
              onReset={resetPacer}
              courseDistance={course.distance}
              runnerType="pacer"
            />
          )}
        </div>
      </PanelContent>
    </Panel>
  );
};
