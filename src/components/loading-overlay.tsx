import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
  currentSamples?: number;
  totalSamples?: number;
}

export const LoadingOverlay = ({
  isVisible,
  currentSamples,
  totalSamples,
}: LoadingOverlayProps) => {
  if (!isVisible) return null;

  const percentage =
    currentSamples && totalSamples
      ? Math.round((currentSamples / totalSamples) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="p-8 flex flex-col items-center gap-4 min-w-[300px]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold">Running Simulation...</p>
          {currentSamples && totalSamples && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                {currentSamples.toLocaleString()} /{' '}
                {totalSamples.toLocaleString()} samples
              </p>
              <p className="font-mono text-lg">{percentage}%</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
