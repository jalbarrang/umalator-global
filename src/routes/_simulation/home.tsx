import { Activity, useCallback, useMemo, useState } from 'react';
import {
  createNewSeed,
  resetResults,
  setSeed,
  useRaceStore,
} from '@/modules/simulation/stores/compare.store';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { LoadingOverlay } from '@/components/loading-overlay';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import { useSimulationRunner } from '@/modules/simulation/hooks/compare/useSimulationRunner';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { SimulationResultTabs } from '@/modules/simulation/tabs/simulation-result-tabs';
import { ResultButtonGroups } from '@/modules/simulation/tabs/summary-tab';
import { useSettingsStore } from '@/store/settings.store';
import { useSelectedPacemakerBooleans } from '@/store/settings/actions';
import { useUIStore } from '@/store/ui.store';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseSeed } from '@/utils/crypto';

export function SimulationHome() {
  const { chartData, results, isSimulationRunning, simulationProgress, seed } = useRaceStore();
  const { courseId } = useSettingsStore();
  const { showVirtualPacemakerOnGraph } = useUIStore();
  const selectedPacemakers = useSelectedPacemakerBooleans();
  const { handleRunCompare, handleRunOnce } = useSimulationRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const [seedInput, setSeedInput] = useState<string>('');

  const handleSeedInputBlur = useCallback(() => {
    const parsedSeed = parseSeed(seedInput);
    if (parsedSeed === null) return;
    setSeed(parsedSeed);
  }, [seedInput]);

  const handleRunAllSamples = () => {
    const newSeed = createNewSeed();
    handleRunCompare(newSeed);
  };

  const handleRunOneSample = () => {
    const newSeed = createNewSeed();
    handleRunOnce(newSeed);
  };

  const handleReplayAllSamples = () => {
    if (seed === null) return;
    handleRunCompare(seed);
  };

  const handleReplayOneSample = () => {
    if (seed === null) return;
    handleRunOnce(seed);
  };

  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="flex items-center gap-2">
        <ButtonGroup>
          <Button onClick={handleRunAllSamples} disabled={isSimulationRunning} variant="default">
            Run all samples
          </Button>
          <Button onClick={handleRunOneSample} disabled={isSimulationRunning} variant="outline">
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

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="seed-input" className="text-sm text-muted-foreground">
            Seed:
          </Label>
          <Input
            id="seed-input"
            type="number"
            value={seedInput}
            onChange={(e) => setSeedInput(e.target.value)}
            onBlur={handleSeedInputBlur}
            placeholder="Run to generate"
            className="w-40"
            disabled={isSimulationRunning}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReplayAllSamples}
            disabled={isSimulationRunning || seedInput.trim() === ''}
          >
            Replay All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReplayOneSample}
            disabled={isSimulationRunning || seedInput.trim() === ''}
          >
            Replay One
          </Button>
        </div>
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

        <RaceSettingsPanel />

        {results.length > 0 && <ResultButtonGroups />}

        <Separator />

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
