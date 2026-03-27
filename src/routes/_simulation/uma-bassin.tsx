import { useMemo } from 'react';
import { Activity } from 'lucide-react';
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
import { Loader2 } from 'lucide-react';
import { formatMs } from '@/utils/time';

export function UmaBassin() {
  const { selectedSkills, setSelectedSkills } = useChartData();
  const {
    results: umaBasinResults,
    metrics,
    progress,
    isSimulationRunning,
    seed,
    skillLoadingStates,
  } = useUniqueSkillBasinStore();
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
        {isSimulationRunning && !progress && (
          <div className="mb-4 p-3 bg-primary/5 rounded-md border border-primary/20">
            <div className="flex items-center gap-4 text-sm">
              <Activity className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-muted-foreground">Preparing simulation…</span>
            </div>
          </div>
        )}

        {/* Metrics Display */}
        {!isSimulationRunning && metrics && (
          <div className="mb-4 p-3 bg-muted/50 rounded-md border">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>
                <strong>Time:</strong> {formatMs(metrics.timeTaken)}s
              </span>
              <span>
                <strong>Skills Processed:</strong> {metrics.skillsProcessed}
              </span>
            </div>
          </div>
        )}

        {/* Simulation Progress Banner */}
        {isSimulationRunning && progress && (
          <div className="mb-4 p-3 bg-primary/5 rounded-md border border-primary/20">
            <div className="flex items-center gap-4 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <span className="font-medium">
                Stage {progress.currentStage}/{progress.totalStages}
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((progress.skillsCompletedInStage / progress.totalSkillsInStage) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-muted-foreground tabular-nums shrink-0">
                {progress.skillsCompletedInStage}/{progress.totalSkillsInStage} skills
              </span>
            </div>
          </div>
        )}

        <BasinnChart
          data={arrayResults}
          hiddenSkills={[]}
          selectedSkills={selectedSkills}
          metrics={metrics}
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
