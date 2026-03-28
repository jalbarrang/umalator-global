import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  createNewSeed,
  resetTable,
  setSeed,
  useChartData,
  useUniqueSkillBasinStore,
} from '@/modules/simulation/stores/uma-basin.store';
import { BasinnChart } from '@/components/bassin-chart/BasinnChart';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { replaceRunnerOutfit, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { useUmaBasinPoolRunner } from '@/modules/simulation/hooks/pool/useUmaBasinPoolRunner';
import { getUmaForUniqueSkill } from '@/modules/skills/utils';
import { SimulationControlBar } from '@/components/simulation-control-bar';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { useUmaSingleRunner } from '@/modules/simulation/hooks/uma-bassin/useUmaSingleRunner';
import { umaBassinSteps } from '@/modules/tutorial/steps/uma-bassin-steps';
import { TutorialId } from '@/components/tutorial/types';
import { SimulationProgressBanner } from '@/components/simulation-progress-banner';

export function UmaBassin() {
  const { selectedSkills, setSelectedSkills } = useChartData();
  const {
    results: umaBasinResults,
    isSimulationRunning,
    seed,
    skillLoadingStates,
  } = useUniqueSkillBasinStore(
    useShallow((state) => {
      return {
        results: state.results,
        isSimulationRunning: state.isSimulationRunning,
        seed: state.seed,
        skillLoadingStates: state.skillLoadingStates,
      };
    }),
  );
  const courseId = useSettingsStore(useShallow((state) => state.courseId));

  const { runner, updateRunner, addSkill } = useRunner();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const arrayResults = useMemo(() => {
    return Object.values(umaBasinResults);
  }, [umaBasinResults]);
  const resultCount = useMemo(() => {
    return arrayResults.length;
  }, [arrayResults]);

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

  const tutorialSettings = useMemo(() => {
    return {
      id: 'uma-bassin' as TutorialId,
      steps: umaBassinSteps,
      tooltip: 'How to use Uma Chart',
    };
  }, []);

  return (
    <div className="flex flex-col flex-1 min-w-0 gap-4">
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
        dataTutorial="uma-bassin-controls"
      />

      <div data-tutorial="uma-bassin-chart" className="flex gap-4 h-full min-w-0">
        <SimulationProgressBanner useStore={useUniqueSkillBasinStore} />

        <BasinnChart
          data={arrayResults}
          hiddenSkills={[]}
          selectedSkills={selectedSkills}
          onSelectionChange={handleSkillSelected}
          onAddSkill={handleAddSkill}
          onReplaceOutfit={handleReplaceRunnerOutfit}
          showUmaIcons
          isSimulationRunning={isSimulationRunning}
          courseDistance={course.distance}
          currentSeed={seed}
          skillLoadingStates={skillLoadingStates}
          onRunAdditionalSamples={runAdditionalSamples}
          className="min-w-0 flex-1"
        />
      </div>
    </div>
  );
}
