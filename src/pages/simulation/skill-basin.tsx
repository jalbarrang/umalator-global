import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { Button } from '@/components/ui/button';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
// import { useSkillBassinRunner } from '@simulation/hooks/skill-bassin/useSkillBasinRunner';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import { useSkillBasinStore } from '@simulation/stores/skill-basin.store';
import { useRaceStore } from '@simulation/stores/compare.store';
import { setSkillToRunner, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUIStore } from '@/store/ui.store';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSkillBasinPoolRunner } from '@/modules/simulation/hooks/pool/useSkillBasinPoolRunner';

export const SkillBassinPage = () => {
  const { chartData } = useRaceStore();
  const { results: skillBasinResults, metrics } = useSkillBasinStore();
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runnerId, runner } = useRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const basinnChartSelection = (skillId: string) => {
    const results = skillBasinResults.get(skillId);

    if (results?.runData) {
      useRaceStore.setState({ results: results.results });
    }
  };

  const addSkillFromTable = (skillId: string) => {
    setSkillToRunner(runnerId, skillId);
  };

  const { isSimulationRunning } = useUIStore();
  const { doBasinnChart } = useSkillBasinPoolRunner();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          onClick={doBasinnChart}
          disabled={isSimulationRunning}
        >
          Run Skill Simulations
        </Button>
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

      <div>
        <BasinnChart
          data={Array.from(skillBasinResults.values())}
          hiddenSkills={runner.skills}
          metrics={metrics}
          onSelectionChange={basinnChartSelection}
          onAddSkill={addSkillFromTable}
        />
      </div>
    </div>
  );
};
