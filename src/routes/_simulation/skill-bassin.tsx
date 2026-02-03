import { Activity, useCallback, useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSkillBasinPoolRunner } from '@/modules/simulation/hooks/pool/useSkillBasinPoolRunner';
import {
  createNewSeed,
  resetTable,
  setSeed,
  useChartData,
  useSkillBasinStore,
} from '@/modules/simulation/stores/skill-basin.store';
import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Button } from '@/components/ui/button';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { setSkillToRunner, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseSeed } from '@/utils/crypto';
import { useSkillSingleRunner } from '@/modules/simulation/hooks/skill-bassin/useSkillSingleRunner';
import { HelpButton } from '@/components/ui/help-button';
import { skillBassinSteps } from '@/modules/tutorial/steps/skill-bassin-steps';
import { isFirstVisit, markVisited } from '@/store/tutorial.store';
import { useTutorial } from '@/components/tutorial';

export function SkillBassin() {
  const { selectedSkills, setSelectedSkills } = useChartData();
  const {
    results: skillBasinResults,
    metrics,
    progress,
    isSimulationRunning,
    seed,
    skillLoadingStates,
  } = useSkillBasinStore();
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runnerId, runner } = useRunner();
  const { start: startTutorial } = useTutorial();

  // Auto-trigger tutorial on first visit
  useEffect(() => {
    if (isFirstVisit('skill-bassin')) {
      const timer = setTimeout(() => {
        markVisited('skill-bassin');
        startTutorial('skill-bassin', skillBassinSteps);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [startTutorial]);
  const [seedInput, setSeedInput] = useState<string>(() => {
    if (seed === null) return '';
    return seed.toString();
  });

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const handleSeedInputBlur = useCallback(() => {
    const parsedSeed = parseSeed(seedInput);
    if (parsedSeed === null) return;
    setSeed(parsedSeed);
  }, [seedInput]);

  const basinnChartSelection = (skillId: string) => {
    const results = skillBasinResults[skillId];

    if (results?.runData) {
      setSelectedSkills((prev) => {
        if (prev.includes(skillId)) {
          return prev.filter((id) => id !== skillId);
        }

        return [...prev, skillId];
      });
    }
  };

  const addSkillFromTable = (skillId: string) => {
    setSkillToRunner(runnerId, skillId);
  };

  const { doBasinnChart, cancelSimulation } = useSkillBasinPoolRunner();
  const { runAdditionalSamples } = useSkillSingleRunner();

  const handleRunSimulation = () => {
    const newSeed = createNewSeed();
    setSeedInput(newSeed.toString());
    doBasinnChart(newSeed);
  };

  const handleReplay = () => {
    if (seed === null) return;

    doBasinnChart(seed);
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div data-tutorial="skill-bassin-controls" className="flex items-center gap-2">
        {!isSimulationRunning && (
          <Button variant="default" onClick={handleRunSimulation}>
            Run Skill Simulations
          </Button>
        )}

        {isSimulationRunning && (
          <Button variant="destructive" onClick={cancelSimulation}>
            Cancel Simulation
          </Button>
        )}

        <HelpButton
          tutorialId="skill-bassin"
          steps={skillBassinSteps}
          tooltipText="How to use Skill Chart"
          className="ml-auto"
        />

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
            variant="outline"
            onClick={handleReplay}
            disabled={isSimulationRunning || seedInput.trim() === ''}
          >
            Replay
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={resetTable}
          disabled={Object.keys(skillBasinResults).length === 0}
        >
          Clear
        </Button>
      </div>

      <Activity mode={!isSimulationRunning ? 'visible' : 'hidden'}>
        <RaceSettingsPanel />

        <div data-tutorial="skill-bassin-table">
          <BasinnChart
            data={Object.values(skillBasinResults)}
            hiddenSkills={runner.skills}
            metrics={metrics}
            onSelectionChange={basinnChartSelection}
            onAddSkill={addSkillFromTable}
            selectedSkills={selectedSkills}
            isSimulationRunning={isSimulationRunning}
            courseDistance={course.distance}
            currentSeed={seed}
            skillLoadingStates={skillLoadingStates}
            onRunAdditionalSamples={runAdditionalSamples}
          />
        </div>
      </Activity>

      <Activity mode={isSimulationRunning ? 'visible' : 'hidden'}>
        <LoadingOverlay progress={progress} />
      </Activity>
    </div>
  );
}
