import { resetResults, useRaceStore } from '@simulation/stores/compare.store';
import { Activity, useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { LoadingOverlay } from '@/components/loading-overlay';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import { useSimulationRunner } from '@/modules/simulation/hooks/compare/useSimulationRunner';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import { SimulationResultTabs } from '@/modules/simulation/tabs/simulation-result-tabs';
import { ResultButtonGroups } from '@/modules/simulation/tabs/summary-tab';
import { useSettingsStore } from '@/store/settings.store';
import { useSelectedPacemakerBooleans } from '@/store/settings/actions';
import { useUIStore } from '@/store/ui.store';

export const Route = createFileRoute('/_simulation/')({
  component: Home,
});

function Home() {
  const { chartData, results, isSimulationRunning, simulationProgress } = useRaceStore();
  const { courseId } = useSettingsStore();
  const { showVirtualPacemakerOnGraph } = useUIStore();
  const selectedPacemakers = useSelectedPacemakerBooleans();
  const { handleRunCompare, handleRunOnce } = useSimulationRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="flex items-center gap-2">
        <ButtonGroup>
          <Button onClick={handleRunCompare} disabled={isSimulationRunning} variant="default">
            Run all samples
          </Button>
          <Button onClick={handleRunOnce} disabled={isSimulationRunning} variant="outline">
            Run one sample
          </Button>
          <Button
            onClick={resetResults}
            disabled={isSimulationRunning || results.length === 0}
            variant="outline"
          >
            Clear
          </Button>
        </ButtonGroup>
      </div>

      <Activity mode={!isSimulationRunning ? 'visible' : 'hidden'}>
        <RaceTrack
          courseid={courseId}
          chartData={chartData ?? initializeSimulationRun()}
          xOffset={35}
          yOffset={35}
          yExtra={20}
        >
          <VelocityLines
            data={chartData}
            courseDistance={course.distance}
            xOffset={35}
            yOffset={25}
            horseLane={course.horseLane}
            showVirtualPacemaker={showVirtualPacemakerOnGraph}
            selectedPacemakers={selectedPacemakers}
          />
        </RaceTrack>

        {results.length > 0 && <ResultButtonGroups />}

        <SimulationResultTabs />
      </Activity>

      <Activity mode={isSimulationRunning ? 'visible' : 'hidden'}>
        <LoadingOverlay
          currentSamples={simulationProgress?.current}
          totalSamples={simulationProgress?.total}
        />
      </Activity>
    </div>
  );
}
