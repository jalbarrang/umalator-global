import { useMemo } from 'react';
import { getCandidate, useSkillPlannerStore } from '../skill-planner.store';
import { Progress } from '@/components/ui/progress';
import { getSkillMetaById, getSkillNameById } from '@/modules/skills/utils';
import { cn } from '@/lib/utils';

type SkillPlannerResultsProps = React.HTMLAttributes<HTMLDivElement>;

export function SkillPlannerResults(props: SkillPlannerResultsProps) {
  const { className, ...rest } = props;

  const { candidates, budget, isOptimizing, progress, result } = useSkillPlannerStore();

  const candidateList = useMemo(() => Object.values(candidates), [candidates]);
  const canOptimize = useMemo(
    () => candidateList.length > 0 && budget > 0,
    [candidateList, budget],
  );

  const progressPercentage = useMemo(() => {
    return progress ? (progress.completed / progress.total) * 100 : 0;
  }, [progress]);

  // Sort combinations by bashin gain (highest to lowest)
  const rankedCombinations = useMemo(() => {
    if (!result?.allResults) return [];
    return [...result.allResults].sort((a, b) => b.bashin - a.bashin);
  }, [result]);

  return (
    <div className={cn('space-y-4', className)} {...rest}>
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
          {/* Header - Sticky Summary */}
          <div className="border-b bg-primary/10 px-4 py-4 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm flex items-center gap-2">
                Simulation Complete
              </div>

              <div className="flex gap-4 text-sm text-muted-foreground">
                <span>Combinations Tested: {result.simulationCount}</span>
                <span>Time Taken: {(result.timeTaken / 1000).toFixed(1)}s</span>
                <span>Top Results Shown: {rankedCombinations.length}</span>
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
                    {/* Skills List */}
                    <div className="mb-2">
                      {combination.skills.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">
                          No additional skills (baseline)
                        </p>
                      )}

                      {
                        <div className="space-y-1">
                          {combination.skills.map((skillId, skillIndex) => {
                            const skillName = getSkillNameById(skillId);
                            const skillMeta = getSkillMetaById(skillId);
                            const skillIconPath = skillMeta?.iconId
                              ? `/icons/${skillMeta.iconId}.png`
                              : '';
                            const candidate = getCandidate(skillId);

                            return (
                              <div
                                key={`${skillId}-${skillIndex}`}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  {skillIconPath && (
                                    <img
                                      src={skillIconPath}
                                      alt=""
                                      className="w-5 h-5 object-contain"
                                    />
                                  )}
                                  <span>{skillName}</span>
                                </div>

                                {candidate && (
                                  <span className="text-xs text-muted-foreground">
                                    {`${candidate.displayCost ?? candidate.effectiveCost} pts`}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      }
                    </div>

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
