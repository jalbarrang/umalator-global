import { useMemo } from 'react';
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
import { SimulationControlBar } from '@/components/simulation-control-bar';
import { setSkillToRunner, useRunner } from '@/store/runners.store';
import { useSettingsStore } from '@/store/settings.store';
import { RaceSettingsPanel } from '@/modules/skill-planner/components/RaceSettingsPanel';
import { useSkillSingleRunner } from '@/modules/simulation/hooks/skill-bassin/useSkillSingleRunner';
import { skillBassinSteps } from '@/modules/tutorial/steps/skill-bassin-steps';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { TutorialId } from '@/components/tutorial/types';
import { Activity, Loader2 } from 'lucide-react';
import { formatMs } from '@/utils/time';

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

      <div data-tutorial="skill-bassin-table" className="min-w-0">
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
    </div>
  );
}
