import { Activity } from 'react';
import { useRaceTrack } from '../context/RaceTrackContext';

type ThresholdMarkerProps = {
  threshold: number;
  text?: string;
  strokeColor?: string;
};

const ThresholdMarker = ({
  threshold,
  text,
  strokeColor = 'rgb(239, 68, 68)',
}: ThresholdMarkerProps) => {
  const { courseDistance, width, height } = useRaceTrack();

  const x = ((courseDistance - threshold) / courseDistance) * width;

  return (
    <g className="threshold-marker">
      <line
        x1={x}
        y1={-20}
        x2={x}
        y2={height}
        stroke={strokeColor}
        strokeWidth="1"
        strokeDasharray="5,5"
      />
      <text
        x={x}
        y={-25}
        fontSize="10px"
        textAnchor="middle"
        fill="var(--foreground)"
        fontWeight="bold"
      >
        {text ?? `${threshold}m left`}
      </text>
    </g>
  );
};

export const ThresholdMarkers = () => {
  const { showThresholds, courseDistance } = useRaceTrack();

  return (
    <Activity mode={showThresholds ? 'visible' : 'hidden'}>
      <g id="race-threshold-markers">
        <ThresholdMarker
          threshold={courseDistance / 2}
          text={`Halfway (${courseDistance / 2}m)`}
          strokeColor="var(--color-green-400)"
        />
        <ThresholdMarker threshold={777} strokeColor="var(--color-amber-400)" />
        <ThresholdMarker threshold={200} strokeColor="var(--color-amber-400)" />
      </g>
    </Activity>
  );
};
