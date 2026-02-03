/**
 * Compare Loading Overlay
 *
 * Loading overlay specific to compare simulations (home.tsx).
 * Displays sample-based progress tracking.
 */

import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMemo } from 'react';

interface CompareLoadingOverlayProps {
  currentSamples: number | null | undefined;
  totalSamples: number | null | undefined;
}

export const CompareLoadingOverlay = ({
  currentSamples,
  totalSamples,
}: CompareLoadingOverlayProps) => {
  const percentage = useMemo(() => {
    if (!currentSamples || !totalSamples || totalSamples === 0) return 0;
    return Math.round((currentSamples / totalSamples) * 100);
  }, [currentSamples, totalSamples]);

  const hasProgress = currentSamples != null && totalSamples != null;

  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <Card className="p-8 flex flex-col items-center gap-4 min-w-[300px]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />

        <div className="text-center space-y-3 w-full">
          <p className="text-lg font-semibold">Running Simulation...</p>

          {hasProgress && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Processing samples: {currentSamples.toLocaleString()} /{' '}
                {totalSamples.toLocaleString()}
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
