import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ChartLoadingFallbackProps = {
  className?: string;
  height?: number;
};

export function ChartLoadingFallback(props: ChartLoadingFallbackProps) {
  const { className, height = 300 } = props;

  return (
    <div
      className={cn('flex w-full items-end gap-1 rounded-lg border bg-muted/30 p-4', className)}
      style={{ height }}
      aria-busy="true"
      aria-label="Loading chart"
    >
      <Skeleton className="h-[45%] flex-1" />
      <Skeleton className="h-[70%] flex-1" />
      <Skeleton className="h-[55%] flex-1" />
      <Skeleton className="h-[85%] flex-1" />
      <Skeleton className="h-[60%] flex-1" />
      <Skeleton className="h-[75%] flex-1" />
    </div>
  );
}
