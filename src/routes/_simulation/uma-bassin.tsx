import { resetTable, useUniqueSkillBasinStore } from '@simulation/stores/uma-basin.store';
import { Activity, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { Button } from '@/components/ui/button';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import { replaceRunnerOutfit, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUmaBasinPoolRunner } from '@/modules/simulation/hooks/pool/useUmaBasinPoolRunner';
import { useChartData } from '@/modules/simulation/stores/uma-basin.store';
import { ButtonGroup } from '@/components/ui/button-group';
import { getUmaForUniqueSkill } from '@/modules/skills/utils';
import { LoadingOverlay } from '@/components/loading-overlay';

export function UmaBassin() {
  const { chartData, selectedSkills, setSelectedSkills } = useChartData();
  const { results: umaBasinResults, metrics, isSimulationRunning } = useUniqueSkillBasinStore();
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runner, updateRunner, addSkill } = useRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const handleSkillSelected = (skillId: string) => {
    const results = umaBasinResults.get(skillId);

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

          <Button variant="outline" onClick={resetTable} disabled={umaBasinResults.size === 0}>
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

        <div className="grid grid-cols-1 gap-4">
          <BasinnChart
            data={Array.from(umaBasinResults.values())}
            hiddenSkills={[]}
            selectedSkills={selectedSkills}
            metrics={metrics}
            onSelectionChange={handleSkillSelected}
            onAddSkill={handleAddSkill}
            onReplaceOutfit={handleReplaceRunnerOutfit}
            showUmaIcons
            isSimulationRunning={isSimulationRunning}
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
