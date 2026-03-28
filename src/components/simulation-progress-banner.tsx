import { Activity, Loader2 } from 'lucide-react';
import { formatMs } from '@/utils/time';
import type { BasinStoreState } from '@/modules/simulation/stores/create-basin-store';

type SimulationProgressBannerProps = {
  useStore: <T>(selector: (state: BasinStoreState) => T) => T;
};

export function SimulationProgressBanner({ useStore }: SimulationProgressBannerProps) {
  const progress = useStore((s) => s.progress);
  const isSimulationRunning = useStore((s) => s.isSimulationRunning);
  const metrics = useStore((s) => s.metrics);

  if (isSimulationRunning && !progress) {
    return (
      <div className="mb-4 p-3 bg-primary/5 rounded-md border border-primary/20">
        <div className="flex items-center gap-4 text-sm">
          <Activity className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-muted-foreground">Preparing simulation…</span>
        </div>
      </div>
    );
  }

  if (isSimulationRunning && progress) {
    return (
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
    );
  }

  if (!isSimulationRunning && metrics) {
    return (
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
    );
  }

  return null;
}
