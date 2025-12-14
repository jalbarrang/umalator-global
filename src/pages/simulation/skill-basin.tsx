import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import { setSkillToRunner, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useSkillBasinPoolRunner } from '@simulation/hooks/pool/useSkillBasinPoolRunner';
import {
  resetTable,
  useChartData,
  useSkillBasinStore,
} from '@simulation/stores/skill-basin.store';
import { Loader2 } from 'lucide-react';
import { Activity, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

export const SkillBassinPage = () => {
  const { chartData, selectedSkills, setSelectedSkills } = useChartData();
  const {
    results: skillBasinResults,
    metrics,
    isSimulationRunning,
  } = useSkillBasinStore();
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runnerId, runner } = useRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const basinnChartSelection = (skillId: string) => {
    const results = skillBasinResults.get(skillId);

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

  return (
    <div className="flex flex-col gap-4">
      <LoadingOverlay
        isVisible={isSimulationRunning}
        currentSamples={metrics?.skillsProcessed}
        totalSamples={metrics?.totalSamples}
      />

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
            disabled={skillBasinResults.size === 0}
          >
            Clear
          </Button>
        </ButtonGroup>
      </div>

      <Activity mode={!isSimulationRunning ? 'visible' : 'hidden'}>
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

        <div>
          <BasinnChart
            data={Array.from(skillBasinResults.values())}
            hiddenSkills={runner.skills}
            metrics={metrics}
            onSelectionChange={basinnChartSelection}
            onAddSkill={addSkillFromTable}
            selectedSkills={selectedSkills}
            isSimulationRunning={isSimulationRunning}
          />
        </div>
      </Activity>
    </div>
  );
};
