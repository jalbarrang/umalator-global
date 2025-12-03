import {
  resetAllUmas,
  resetPacer,
  resetUma1,
  resetUma2,
  setPacer,
  setUma1,
  setUma2,
  useRunnersStore,
} from '@/store/runners.store';
import { useUIStore } from '@/store/ui.store';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { useMemo } from 'react';
import { RunnerCard } from './runner-card/runner-card';
import { Mode } from '@/utils/settings';
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

export const RunnersPanel = () => {
  const { mode } = useUIStore();
  const { uma1, uma2, pacer } = useRunnersStore();
  const { posKeepMode, courseId } = useSettingsStore();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle className="flex justify-between items-center">
          <span className="font-bold">Runners</span>

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

        <div>
          <RunnerCard
            value={uma1}
            onChange={setUma1}
            onReset={resetUma1}
            courseDistance={course.distance}
          />

          {mode == Mode.Compare && (
            <RunnerCard
              value={uma2}
              onChange={setUma2}
              onReset={resetUma2}
              courseDistance={course.distance}
            />
          )}

          {posKeepMode == PosKeepMode.Virtual && (
            <RunnerCard
              value={pacer}
              onChange={setPacer}
              onReset={resetPacer}
              courseDistance={course.distance}
            />
          )}
        </div>
      </PanelContent>
    </Panel>
  );
};
