import { useCallback, useMemo, useState } from 'react';
import { getObtainedSkills, useSkillPlannerStore } from '../skill-planner.store';
import type { CombinationResult } from '../types';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SaveRunnerModal } from '@/modules/runners/components/save-runner-modal';
import { SkillItem } from '@/modules/skills/components/skill-list/SkillItem';
import { setRunner } from '@/store/runners.store';
import { useRunnerLibraryStore } from '@/store/runner-library.store';
import { toast } from 'sonner';

type SkillPlannerResultsProps = React.HTMLAttributes<HTMLDivElement>;

export function SkillPlannerResults(props: SkillPlannerResultsProps) {
  const { className, ...rest } = props;

  const { candidates, budget, isOptimizing, progress, result, runner } = useSkillPlannerStore();
  const addRunner = useRunnerLibraryStore((state) => state.addRunner);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState<CombinationResult | null>(null);

  const candidateList = useMemo(() => Object.values(candidates), [candidates]);
  const canOptimize = useMemo(
    () => candidateList.length > 0 && budget > 0,
    [candidateList, budget],
  );

  const progressPercentage = useMemo(() => {
    return progress ? (progress.completed / progress.total) * 100 : 0;
  }, [progress]);

  const rankedCombinations = useMemo(() => {
    if (!result?.allResults) return [];

    return result.allResults.toSorted((a, b) => b.bashin - a.bashin);
  }, [result]);

  const optimizationContext = useMemo(() => {
    if (!result) {
      return null;
    }

    const state = useSkillPlannerStore.getState();

    return {
      runner: {
        ...state.runner,
        skills: [...state.runner.skills],
      },
      obtainedSkills: getObtainedSkills(),
    };
  }, [result]);

  const buildSkills = useCallback((combination: CombinationResult): Array<string> => {
    const obtainedSkills = optimizationContext?.obtainedSkills ?? getObtainedSkills();

    return Array.from(new Set([...obtainedSkills, ...combination.skills]));
  }, [optimizationContext]);

  const buildRunnerSnapshot = useCallback(
    (combination: CombinationResult) => {
      const baseRunner = optimizationContext?.runner ?? runner;

      return {
        ...baseRunner,
        skills: buildSkills(combination),
      };
    },
    [optimizationContext, runner, buildSkills],
  );

  const handleOpenSaveModal = useCallback((combination: CombinationResult) => {
    setSelectedCombination(combination);
    setSaveModalOpen(true);
  }, []);

  const handleSaveModalOpenChange = useCallback((open: boolean) => {
    setSaveModalOpen(open);

    if (!open) {
      setSelectedCombination(null);
    }
  }, []);

  const handleSaveToVeterans = useCallback(
    (name: string) => {
      if (!selectedCombination) {
        return;
      }

      addRunner({
        ...buildRunnerSnapshot(selectedCombination),
        notes: name,
      });

      setSelectedCombination(null);
    },
    [addRunner, buildRunnerSnapshot, selectedCombination],
  );

  const handleSendToCompare = useCallback(
    (slot: 'uma1' | 'uma2', combination: CombinationResult) => {
      setRunner(slot, buildRunnerSnapshot(combination));
      toast.success(`Loaded build into ${slot === 'uma1' ? 'Uma 1' : 'Uma 2'}`);
    },
    [buildRunnerSnapshot],
  );

  return (
    <div className={cn('space-y-4', className)} {...rest}>
      <SaveRunnerModal
        open={saveModalOpen}
        onOpenChange={handleSaveModalOpenChange}
        onSave={(name) => handleSaveToVeterans(name)}
        showLinkOption={false}
      />

      {/* Progress Indicator */}
      {isOptimizing && progress && (
        <div className="space-y-2 border rounded-lg p-4 bg-card">
          <div className="flex justify-between text-sm">
            <span>Testing combinations...</span>
            <span className="font-medium">
              {progress.completed} / {progress.total}
            </span>
          </div>
          <Progress value={progressPercentage} />
          {progress.currentBest && (
            <div className="text-xs text-muted-foreground mt-2">
              <p>Current best: +{progress.currentBest.bashin.toFixed(2)} Lengths</p>
              <p className="text-xs opacity-75">
                {progress.currentBest.skills.length} skills for {progress.currentBest.cost} pts
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results Display */}
      {!isOptimizing && result && (
        <div className="border rounded-lg bg-card overflow-hidden">
          {/* Header */}
          <div className="border-b bg-primary/10 px-4 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm flex items-center gap-2">
                Simulation Complete
              </div>

              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Combinations Tested: {result.simulationCount}</span>
                <span>Time Taken: {(result.timeTaken / 1000).toFixed(1)}s</span>
                <span>Results: {rankedCombinations.length}</span>
              </div>
            </div>
          </div>

          {/* Ranked Combinations List */}
          <div className="flex flex-col flex-1">
            <div className="p-4 space-y-3">
              {rankedCombinations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No combinations found
                </p>
              )}

              {rankedCombinations.map((combination, index) => {
                const bashinGain = combination.bashin;

                return (
                  <div
                    key={`combo-${index}-${combination.skills.join('-')}`}
                    className="border rounded-lg p-3 bg-background"
                  >
                    <div className="mb-2 space-y-1">
                      {combination.skills.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          No additional skills (baseline)
                        </p>
                      )}

                      {combination.skills.map((skillId) => {
                        const skillCost = combination.skillCosts[skillId] ?? 0;

                        return (
                          <div key={skillId} className="flex items-center gap-2">
                            <SkillItem skillId={skillId} className="flex-1 border" />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {skillCost} SP
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {combination.skills.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleOpenSaveModal(combination)}
                        >
                          Save to Veterans
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendToCompare('uma1', combination)}
                        >
                          Uma 1
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendToCompare('uma2', combination)}
                        >
                          Uma 2
                        </Button>
                      </div>
                    )}

                    {/* Cost Summary and Lengths */}
                    <div className="grid grid-cols-2 items-center pt-2 border-t text-xs">
                      <div>
                        <span className="text-muted-foreground">Total Cost: </span>
                        <span className="font-medium">
                          {combination.cost} / {budget} pts
                        </span>
                      </div>

                      <div className="flex justify-end items-center gap-2">
                        <div className="font-bold">
                          {bashinGain > 0 ? '+' : ''}
                          {bashinGain.toFixed(2)}
                        </div>

                        <div className="text-xs text-muted-foreground">Lengths</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isOptimizing && !result && (
        <div className="text-center text-muted-foreground py-8 border rounded-lg bg-muted/30">
          <p className="text-sm">Click "Optimize" to find the best skill combination</p>
          <p className="text-xs mt-2">
            {!canOptimize && 'Add candidate skills and set a budget to begin'}
          </p>
        </div>
      )}
    </div>
  );
}
