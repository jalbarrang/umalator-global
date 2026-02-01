import { Activity, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSkillBasinPoolRunner } from '@/modules/simulation/hooks/pool/useSkillBasinPoolRunner';
import {
  resetTable,
  useChartData,
  useSkillBasinStore,
} from '@/modules/simulation/stores/skill-basin.store';
import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { setSkillToRunner, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSeedManager } from '@/hooks/useSeedManager';

export function SkillBassin() {
  const { chartData, selectedSkills, setSelectedSkills } = useChartData();
  const { results: skillBasinResults, metrics, isSimulationRunning } = useSkillBasinStore();
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runnerId, runner } = useRunner();

  const { seedInput, setSeedInput, generateNewSeed, getReplaySeed } = useSeedManager();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

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

  const handleRunSimulation = () => {
    const seed = generateNewSeed();
    doBasinnChart(seed);
  };

  const handleReplay = () => {
    const seed = getReplaySeed();
    if (seed !== null) {
      doBasinnChart(seed);
    }
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="flex items-center gap-2">
        <ButtonGroup>
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

          <Button
            variant="outline"
            onClick={resetTable}
            disabled={Object.keys(skillBasinResults).length === 0}
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
            placeholder="Run to generate"
            className="w-40"
            disabled={isSimulationRunning}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReplay}
            disabled={isSimulationRunning || seedInput.trim() === ''}
          >
            Replay
          </Button>
        </div>
      </div>

      <Activity mode={!isSimulationRunning ? 'visible' : 'hidden'}>
        <RaceTrack courseid={courseId} chartData={chartData} xOffset={35} yOffset={35} yExtra={20}>
          <VelocityLines
            data={chartData}
            courseDistance={course.distance}
            xOffset={35}
            yOffset={25}
            horseLane={course.horseLane}
            showVirtualPacemaker={false}
            selectedPacemakers={[]}
          />
        </RaceTrack>

        <RaceSettingsPanel />

        <div>
          <BasinnChart
            data={Object.values(skillBasinResults)}
            hiddenSkills={runner.skills}
            metrics={metrics}
            onSelectionChange={basinnChartSelection}
            onAddSkill={addSkillFromTable}
            selectedSkills={selectedSkills}
            isSimulationRunning={isSimulationRunning}
            courseDistance={course.distance}
          />
        </div>
      </Activity>

      <Activity mode={isSimulationRunning ? 'visible' : 'hidden'}>
        <LoadingOverlay
          currentSamples={metrics?.skillsProcessed}
          totalSamples={metrics?.totalSamples}
        />
      </Activity>
    </div>
  );
}
