import { useRaceTrackDisplay } from '@/store/settings.store';
import React, { Activity } from 'react';
import { RaceTrackDimensions } from '../types';

type ThresholdMarkerProps = {
  threshold: number;
  courseDistance: number;
  width: number;
  height: number;
  text?: string;
  strokeColor?: string;
};

const ThresholdMarker = React.memo((props: ThresholdMarkerProps) => {
  const {
    threshold,
    text,
    strokeColor = 'rgb(239, 68, 68)',
    courseDistance,
    width,
    height
  } = props;

  const x = ((courseDistance - threshold) / courseDistance) * width;

  return (
    <g className="threshold-marker">
      <line
        x1={x + RaceTrackDimensions.xOffset}
        y1={20}
        x2={x + RaceTrackDimensions.xOffset}
        y2={height - 20}
        stroke={strokeColor}
        strokeWidth="1"
        strokeDasharray="5,5"
      />

      <text
        x={x + RaceTrackDimensions.xOffset}
        y={12}
        fontSize="8px"
        textAnchor="middle"
        fill="var(--foreground)"
        fontWeight="bold"
      >
        {text ?? `${threshold}m left`}
      </text>
    </g>
  );
});

type ThresholdMarkersProps = {
  courseDistance: number;
};

const width = RaceTrackDimensions.RenderWidth;
const height = RaceTrackDimensions.ViewHeight;

export const ThresholdMarkers = React.memo((props: ThresholdMarkersProps) => {
  const { courseDistance } = props;

  const { showThresholdHalfway, showThreshold777, showThreshold200 } = useRaceTrackDisplay();

  return (
    <g id="race-threshold-markers">
      <Activity mode={showThresholdHalfway ? 'visible' : 'hidden'}>
        <ThresholdMarker
          threshold={courseDistance / 2}
          courseDistance={courseDistance}
          width={width}
          height={height}
          text={`Halfway (${courseDistance / 2}m)`}
          strokeColor="var(--color-green-400)"
        />
      </Activity>

      <Activity mode={showThreshold777 ? 'visible' : 'hidden'}>
        <ThresholdMarker
          threshold={777}
          strokeColor="var(--color-amber-400)"
          courseDistance={courseDistance}
          width={width}
          height={height}
        />
      </Activity>

      <Activity mode={showThreshold200 ? 'visible' : 'hidden'}>
        <ThresholdMarker
          threshold={200}
          strokeColor="var(--color-amber-400)"
          courseDistance={courseDistance}
          width={width}
          height={height}
        />
      </Activity>
    </g>
  );
});
