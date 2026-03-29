import { memo } from 'react';
import { TrackGraphCanvas } from './TrackGraphCanvas';
import { type TrackGraphViewProps } from './shared';
import { useTrackGraphCanvas } from './useTrackGraphCanvas';

export const TrackGraphView = memo<TrackGraphViewProps>(function TrackGraphView({
  className,
  ...graphProps
}) {
  const { containerRef, canvasRef } = useTrackGraphCanvas(graphProps);

  return (
    <TrackGraphCanvas
      containerRef={containerRef}
      canvasRef={canvasRef}
      className={className}
    />
  );
});
