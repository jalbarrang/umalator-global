import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { Button } from '@/components/ui/button';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import {
  resetTable,
  useUniqueSkillBasinStore,
} from '@simulation/stores/uma-basin.store';
import { replaceRunnerOutfit, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUIStore } from '@/store/ui.store';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useUmaBasinPoolRunner } from '@/modules/simulation/hooks/pool/useUmaBasinPoolRunner';
import { useChartData } from '@/modules/simulation/stores/uma-basin.store';
import { ButtonGroup } from '@/components/ui/button-group';
import { Loader2 } from 'lucide-react';
import { getUmaForUniqueSkill } from '@/modules/skills/utils';

export const UmaBassinPage = () => {
  const { chartData, selectedSkills, setSelectedSkills } = useChartData();
  const { results: umaBasinResults, metrics } = useUniqueSkillBasinStore();
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

  const { isSimulationRunning } = useUIStore();
  const { doBasinnChart, cancelSimulation } = useUmaBasinPoolRunner();

  return (
    <div className="flex flex-col gap-4">
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
              <Loader2 className="w-4 h-4 animate-spin" />
            </Button>
          )}

          <Button
            variant="outline"
            onClick={resetTable}
            disabled={umaBasinResults.size === 0}
          >
            Reset
          </Button>
        </ButtonGroup>
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
        />
      </div>
    </div>
  );
};
