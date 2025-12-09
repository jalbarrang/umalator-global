import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { Button } from '@/components/ui/button';
import { VelocityLines } from '@/components/VelocityLines';
import { RaceTrack } from '@/modules/racetrack/components/RaceTrack';
// import { useUmaBassinRunner } from '@simulation/hooks/uma-bassin/useUmaBasinRunner';
import { CourseHelpers } from '@/modules/simulation/lib/CourseData';
import { useUniqueSkillBasinStore } from '@simulation/stores/uma-basin.store';
import { useRaceStore } from '@simulation/stores/compare.store';
import { setSkillToRunner, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUIStore } from '@/store/ui.store';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useUmaBasinPoolRunner } from '@/modules/simulation/hooks/pool/useUmaBasinPoolRunner';

export const UmaBassinPage = () => {
  const { chartData } = useRaceStore();
  const { results: umaBasinResults, metrics } = useUniqueSkillBasinStore();
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runnerId } = useRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const basinnChartSelection = (skillId: string) => {
    const results = umaBasinResults.get(skillId);

    if (results?.runData) {
      useRaceStore.setState({ results: results.results });
    }
  };

  const addSkillFromTable = (skillId: string) => {
    setSkillToRunner(runnerId, skillId);
  };

  const { isSimulationRunning } = useUIStore();
  const { doBasinnChart } = useUmaBasinPoolRunner();

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

      <div className="grid grid-cols-1 gap-4">
        <BasinnChart
          data={Array.from(umaBasinResults.values())}
          hiddenSkills={[]}
          metrics={metrics}
          onSelectionChange={basinnChartSelection}
          onAddSkill={addSkillFromTable}
          showUmaIcons
        />
      </div>
    </div>
  );
};
