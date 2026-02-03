import { Loader2 } from 'lucide-react';
import type { SimulationProgress } from '@/workers/pool/types';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface LoadingOverlayProps {
  progress: SimulationProgress | null;
}

export const LoadingOverlay = ({ progress }: LoadingOverlayProps) => {
  const percentage = progress
    ? Math.round((progress.skillsCompletedInStage / progress.totalSkillsInStage) * 100)
    : 0;

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <Card className="p-8 flex flex-col items-center gap-4 min-w-[300px]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />

        <div className="text-center space-y-3 w-full">
          <p className="text-lg font-semibold">Running Simulation...</p>

          {progress && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Stage {progress.currentStage} of {progress.totalStages}
              </p>
              <p>
                Processing skills: {progress.skillsCompletedInStage.toLocaleString()} /{' '}
                {progress.totalSkillsInStage.toLocaleString()}
              </p>
              <Progress value={percentage} className="w-full" />
              <p className="font-mono text-lg">{percentage}%</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
