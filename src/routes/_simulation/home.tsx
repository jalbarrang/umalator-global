import { Activity, useCallback, useState } from 'react';
import {
  createNewSeed,
  resetResults,
  setSeed,
  useRaceStore,
} from '@/modules/simulation/stores/compare.store';
import { Button } from '@/components/ui/button';
import { CompareLoadingOverlay } from '@/components/compare-loading-overlay';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';
import { useSimulationRunner } from '@/modules/simulation/hooks/compare/useSimulationRunner';
import { SimulationResultTabs } from '@/modules/simulation/tabs/simulation-result-tabs';
import { ResultButtonGroups } from '@/modules/simulation/tabs/summary-tab';
import { useSettingsStore } from '@/store/settings.store';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseSeed } from '@/utils/crypto';
import { HelpButton } from '@/components/ui/help-button';
import { umalatorSteps } from '@/modules/tutorial/steps/umalator-steps';
import { SectionNumbersBar } from '@/modules/racetrack/layers/section-numbers';
import { SectionTypesBar } from '@/modules/racetrack/layers/section-bar';
import { PhaseBar } from '@/modules/racetrack/layers/phase-bar';
import { UmaSkillSection } from '@/modules/racetrack/skills/uma-skill-section';
import { RaceTrackRoot } from '@/modules/racetrack/core/racetrack-root';
import { TrackHeader } from '@/modules/racetrack/chrome/track-header';
import { YAxis } from '@/modules/racetrack/axes/y-axis';
import { RaceTrackRender } from '@/modules/racetrack/core/racetrack-render';
import { TrackLegend } from '@/modules/racetrack/chrome/track-legend';
import { TrackControls } from '@/modules/racetrack/chrome/track-controls';
import { XAxis } from '@/modules/racetrack/axes/x-axis';
import { SlopeLabelBar } from '@/modules/racetrack/layers/slope-label-bar';
import { SlopeVisualization } from '@/modules/racetrack/layers/slope-visualization';

export function SimulationHome() {
  const { chartData, results, isSimulationRunning, simulationProgress, seed } = useRaceStore();
  const { courseId } = useSettingsStore();
  const { handleRunCompare, handleRunOnce } = useSimulationRunner();

  const [seedInput, setSeedInput] = useState<string>(() => {
    if (seed === null) return '';
    return seed.toString();
  });

  const handleSeedInputBlur = useCallback(() => {
    const parsedSeed = parseSeed(seedInput);
    if (parsedSeed === null) return;
    setSeed(parsedSeed);
  }, [seedInput]);

  const handleRunAllSamples = () => {
    const newSeed = createNewSeed();
    setSeedInput(newSeed.toString());
    handleRunCompare(newSeed);
  };

  const handleRunOneSample = () => {
    const newSeed = createNewSeed();
    setSeedInput(newSeed.toString());
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
      <div data-tutorial="simulation-controls" className="flex items-center gap-2">
        <Button
          data-tutorial="run-all-samples"
          onClick={handleRunAllSamples}
          disabled={isSimulationRunning}
          variant="default"
        >
          Run all samples
        </Button>
        <Button onClick={handleRunOneSample} disabled={isSimulationRunning} variant="outline">
          Run one sample
        </Button>

        <HelpButton tutorialId="umalator" steps={umalatorSteps} tooltipText="Show tutorial" />

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

        <Button
          onClick={resetResults}
          disabled={isSimulationRunning || results.length === 0}
          variant="outline"
        >
          Clear
        </Button>
      </div>

      <Activity mode={!isSimulationRunning ? 'visible' : 'hidden'}>
        <div data-tutorial="race-visualization">
          <RaceTrackRoot courseid={courseId} chartData={chartData ?? initializeSimulationRun()}>
            <TrackHeader />

            <RaceTrackRender>
              {/* Background */}
              <SlopeVisualization />

              {/* Bars */}
              <SlopeLabelBar yOffset={72} />
              <SectionTypesBar yOffset={72 + 50} />
              <PhaseBar yOffset={72 + 50} />
              <SectionNumbersBar yOffset={72 + 50 + 20} />

              <UmaSkillSection yOffset={72 + 50 + 20 + 20} />

              {/* Axes */}
              <YAxis xOffset={20} />
              <XAxis yOffset={240 - 20} xOffset={20} />
            </RaceTrackRender>

            <TrackLegend />
            <TrackControls />
          </RaceTrackRoot>
        </div>

        <div data-tutorial="race-settings">
          <RaceSettingsPanel />
        </div>

        {results.length > 0 && <ResultButtonGroups />}

        <Separator />

        <div data-tutorial="results-tabs">
          <SimulationResultTabs />
        </div>
      </Activity>

      <Activity mode={isSimulationRunning ? 'visible' : 'hidden'}>
        <CompareLoadingOverlay
          currentSamples={simulationProgress?.current}
          totalSamples={simulationProgress?.total}
        />
      </Activity>
    </div>
  );
}
