import type { RefObject } from 'react';
import { cn } from '@/lib/utils';

type TrackGraphCanvasProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  className?: string;
};

export function TrackGraphCanvas({
  containerRef,
  canvasRef,
  className,
}: TrackGraphCanvasProps) {
  return (
    <div ref={containerRef} className={cn('min-w-0 max-w-full', className)}>
      <canvas
        ref={canvasRef}
        className="block h-auto w-full"
        aria-label="Track graph playback view"
      />
    </div>
  );
}
