import { Activity, useMemo } from 'react';
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
import { SimulationControlBar } from '@/components/simulation-control-bar';
import { setSkillToRunner, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { useSkillSingleRunner } from '@/modules/simulation/hooks/skill-bassin/useSkillSingleRunner';
import { skillBassinSteps } from '@/modules/tutorial/steps/skill-bassin-steps';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { TutorialId } from '@/components/tutorial/types';

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

  const arrayResults = useMemo(() => {
    return Object.values(skillBasinResults);
  }, [skillBasinResults]);

  const resultCount = useMemo(() => {
    return arrayResults.length;
  }, [arrayResults]);

  const addSkillFromTable = (skillId: string) => {
    setSkillToRunner(runnerId, skillId);
  };

  const { doBasinnChart, cancelSimulation } = useSkillBasinPoolRunner();
  const { runAdditionalSamples } = useSkillSingleRunner();

  const tutorialSettings = useMemo(() => {
    return {
      id: 'skill-bassin' as TutorialId,
      steps: skillBassinSteps,
      tooltip: 'How to use Skill Chart',
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 flex-1 min-w-0">
      <RaceSettingsPanel />

      <SimulationControlBar
        isRunning={isSimulationRunning}
        seed={seed}
        onRun={doBasinnChart}
        onCancel={cancelSimulation}
        onReplay={doBasinnChart}
        onClear={resetTable}
        clearDisabled={resultCount === 0}
        createSeed={createNewSeed}
        setSeed={setSeed}
        tutorial={tutorialSettings}
        dataTutorial="skill-bassin-controls"
      />

      <Activity mode={!isSimulationRunning ? 'visible' : 'hidden'}>
        <div data-tutorial="skill-bassin-table" className="min-w-0">
          <BasinnChart
            data={arrayResults}
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
            className="min-w-0"
          />
        </div>
      </Activity>

      <Activity mode={isSimulationRunning ? 'visible' : 'hidden'}>
        <LoadingOverlay progress={progress} />
      </Activity>
    </div>
  );
}
