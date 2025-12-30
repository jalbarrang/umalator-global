import { CheckIcon, PlayIcon, XIcon } from 'lucide-react';
import { clearResult, useSkillPlannerStore } from '../store';
import { useSkillPlannerWorker } from '../hooks/useSkillPlannerWorker';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getSkillNameById } from '@/modules/skills/utils';
import { setSkillToRunner, useRunner } from '@/store/runners.store';

export function SkillPlannerResults() {
  const { candidates, budget, isOptimizing, progress, result } = useSkillPlannerStore();
  const { startOptimization, cancelOptimization } = useSkillPlannerWorker();
  const { runnerId } = useRunner();

  const candidateList = Array.from(candidates.values());
  const canOptimize = candidateList.length > 0 && budget > 0;

  const handleOptimize = () => {
    startOptimization(candidateList, budget);
  };

  const handleApplyToRunner = () => {
    if (!result) return;

    // Add all recommended skills to the runner
    result.skillsToBuy.forEach((skillId) => {
      setSkillToRunner(runnerId, skillId);
    });

    // Clear the result after applying
    clearResult();
  };

  const progressPercent = progress ? (progress.completed / progress.total) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Optimize Button */}
      <div className="flex gap-2">
        {!isOptimizing && (
          <Button
            onClick={handleOptimize}
            disabled={!canOptimize}
            className="flex-1"
          >
            <PlayIcon className="w-4 h-4 mr-2" />
            Optimize
          </Button>
        )}
        {isOptimizing && (
          <Button
            onClick={cancelOptimization}
            variant="destructive"
            className="flex-1"
          >
            <XIcon className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        )}
      </div>

      {/* Progress Indicator */}
      {isOptimizing && progress && (
        <div className="space-y-2 border rounded-lg p-4 bg-card">
          <div className="flex justify-between text-sm">
            <span>Testing combinations...</span>
            <span className="font-medium">
              {progress.completed} / {progress.total}
            </span>
          </div>
          <Progress value={progressPercent} />
          {progress.currentBest && (
            <div className="text-xs text-muted-foreground mt-2">
              <p>Current best: +{progress.currentBest.bashin.toFixed(2)} Bashin</p>
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
          <div className="border-b bg-primary/10 p-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              Optimization Complete
            </h3>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Gain:</span>
                <span className="font-bold text-lg text-green-600">
                  +{result.expectedBashin.toFixed(2)} Bashin
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost:</span>
                <span className="font-medium">{result.totalCost} / {budget} pts</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Combinations Tested:</span>
                <span>{result.simulationCount}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Time Taken:</span>
                <span>{(result.timeTaken / 1000).toFixed(1)}s</span>
              </div>
            </div>
          </div>

          {/* Recommended Skills */}
          <div className="p-4">
            <h4 className="font-medium text-sm mb-2">Recommended Skills to Buy:</h4>
            {result.skillsToBuy.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No skills recommended (current setup is optimal)
              </p>
            ) : (
              <div className="max-h-[200px] overflow-y-auto">
                <div className="space-y-1 pr-2">
                  {result.skillsToBuy.map((skillId, index) => {
                    const candidate = candidates.get(skillId);
                    const skillName = getSkillNameById(skillId);
                    return (
                      <div
                        key={`${skillId}-${index}`}
                        className="flex items-center justify-between p-2 border rounded bg-background text-sm"
                      >
                        <span>{skillName}</span>
                        <span className="text-muted-foreground text-xs">
                          {candidate && !candidate.isObtained ? `${candidate.effectiveCost} pts` : 'Free'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Apply Button */}
          {result.skillsToBuy.length > 0 && (
            <div className="border-t p-4">
              <Button onClick={handleApplyToRunner} className="w-full">
                Apply to Runner
              </Button>
            </div>
          )}
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

