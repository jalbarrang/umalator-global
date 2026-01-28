import { Activity, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  resetTable,
  useChartData,
  useUniqueSkillBasinStore,
} from '@/modules/simulation/stores/uma-basin.store';
import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { Button } from '@/components/ui/button';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { replaceRunnerOutfit, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUmaBasinPoolRunner } from '@/modules/simulation/hooks/pool/useUmaBasinPoolRunner';
import { ButtonGroup } from '@/components/ui/button-group';
import { getUmaForUniqueSkill } from '@/modules/skills/utils';
import { LoadingOverlay } from '@/components/loading-overlay';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';

export function UmaBassin() {
  const { chartData, selectedSkills, setSelectedSkills } = useChartData();
  const { results: umaBasinResults, metrics, isSimulationRunning } = useUniqueSkillBasinStore();
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runner, updateRunner, addSkill } = useRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

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

  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="flex items-center gap-2">
        <ButtonGroup>
          {!isSimulationRunning && (
            <Button variant="default" onClick={doBasinnChart}>
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
            disabled={Object.keys(umaBasinResults).length === 0}
          >
            Clear
          </Button>
        </ButtonGroup>
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
