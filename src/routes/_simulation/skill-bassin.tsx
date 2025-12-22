import { createFileRoute } from '@tanstack/react-router';
import { useSkillBasinPoolRunner } from '@simulation/hooks/pool/useSkillBasinPoolRunner';
import { resetTable, useChartData, useSkillBasinStore } from '@simulation/stores/skill-basin.store';
import { Activity, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import { setSkillToRunner, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';

export const Route = createFileRoute('/_simulation/skill-bassin')({
  component: RouteComponent,
});

function RouteComponent() {
  const { chartData, selectedSkills, setSelectedSkills } = useChartData();
  const { results: skillBasinResults, metrics, isSimulationRunning } = useSkillBasinStore();
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
    <div className="flex flex-col gap-4 flex-1">
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

          <Button variant="outline" onClick={resetTable} disabled={skillBasinResults.size === 0}>
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

      <Activity mode={isSimulationRunning ? 'visible' : 'hidden'}>
        <LoadingOverlay
          currentSamples={metrics?.skillsProcessed}
          totalSamples={metrics?.totalSamples}
        />
      </Activity>
    </div>
  );
}
