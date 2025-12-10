import { Button } from '@/components/ui/button';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { useSimulationRunner } from '@/modules/simulation/hooks/compare/useSimulationRunner';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import { PosKeepMode } from '@/modules/simulation/lib/RaceSolver';
import { SimulationResultTabs } from '@/modules/simulation/tabs/simulation-result-tabs';
import { ResultButtonGroups } from '@/modules/simulation/tabs/summary-tab';
import { useSettingsStore } from '@/store/settings.store';
import { useSelectedPacemakerBooleans } from '@/store/settings/actions';
import { useUIStore } from '@/store/ui.store';
import { useRaceStore } from '@simulation/stores/compare.store';
import { useMemo } from 'react';

export const ComparePage = () => {
  const { chartData, results } = useRaceStore();
  const { posKeepMode, courseId } = useSettingsStore();
  const { showVirtualPacemakerOnGraph, isSimulationRunning } = useUIStore();
  const selectedPacemakers = useSelectedPacemakerBooleans();
  const { handleRunCompare, handleRunOnce } = useSimulationRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={handleRunCompare}
          disabled={isSimulationRunning}
          variant="default"
          size="lg"
        >
          Run all samples
        </Button>

        <Button
          onClick={handleRunOnce}
          disabled={isSimulationRunning}
          variant="outline"
          size="sm"
        >
          Run one sample
        </Button>
      </div>

      <RaceTrack
        courseid={courseId}
        chartData={chartData}
        xOffset={20}
        yOffset={15}
        yExtra={20}
      >
        <VelocityLines
          data={chartData}
          courseDistance={course.distance}
          xOffset={20}
          horseLane={course.horseLane}
          showVirtualPacemaker={false}
          selectedPacemakers={[]}
        />
      </RaceTrack>

      {results.length > 0 && <ResultButtonGroups />}

      <SimulationResultTabs />
    </div>
  );
};
