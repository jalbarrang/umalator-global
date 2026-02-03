import { Activity, useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  createNewSeed,
  resetTable,
  setSeed,
  useChartData,
  useUniqueSkillBasinStore,
} from '@/modules/simulation/stores/uma-basin.store';
import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { Button } from '@/components/ui/button';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { replaceRunnerOutfit, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUmaBasinPoolRunner } from '@/modules/simulation/hooks/pool/useUmaBasinPoolRunner';
import { getUmaForUniqueSkill } from '@/modules/skills/utils';
import { LoadingOverlay } from '@/components/loading-overlay';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { parseSeed } from '@/utils/crypto';
import { useUmaSingleRunner } from '@/modules/simulation/hooks/uma-bassin/useUmaSingleRunner';

export function UmaBassin() {
  const { selectedSkills, setSelectedSkills } = useChartData();
  const {
    results: umaBasinResults,
    metrics,
    progress,
    isSimulationRunning,
    seed,
    skillLoadingStates,
  } = useUniqueSkillBasinStore();
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runner, updateRunner, addSkill } = useRunner();
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

  const handleSkillSelected = (skillId: string) => {
    const results = umaBasinResults[skillId];

    if (results?.runData) {
      setSelectedSkills((prev) => {
        if (prev.includes(skillId)) {
          return prev.filter((id) => id !== skillId);
        }

        return [...prev, skillId];
      });
    }
  };

  const handleAddSkill = (skillId: string) => {
    addSkill(skillId);
  };

  const handleReplaceRunnerOutfit = (skillId: string) => {
    const outfitId = getUmaForUniqueSkill(skillId);
    const newRunnerState = replaceRunnerOutfit(runner, outfitId, runner.skills);

    updateRunner(newRunnerState);
  };

  const { doBasinnChart, cancelSimulation } = useUmaBasinPoolRunner();
  const { runAdditionalSamples } = useUmaSingleRunner();

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
    <div className="flex flex-col flex-1 gap-4">
      <div className="flex items-center gap-2">
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
          disabled={Object.keys(umaBasinResults).length === 0}
        >
          Clear
        </Button>
      </div>

      <Activity mode={!isSimulationRunning ? 'visible' : 'hidden'}>
        {/* <RaceTrack courseid={courseId} chartData={chartData} xOffset={35} yOffset={35} yExtra={20}>
          <VelocityLines
            data={chartData}
            courseDistance={course.distance}
            xOffset={35}
            yOffset={25}
            horseLane={course.horseLane}
            showVirtualPacemaker={false}
            selectedPacemakers={[]}
          />
        </RaceTrack> */}

        <RaceSettingsPanel />

        <div className="grid grid-cols-1 gap-4">
          <BasinnChart
            data={Object.values(umaBasinResults)}
            hiddenSkills={[]}
            selectedSkills={selectedSkills}
            metrics={metrics}
            onSelectionChange={handleSkillSelected}
            onAddSkill={handleAddSkill}
            onReplaceOutfit={handleReplaceRunnerOutfit}
            showUmaIcons
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
