import { useRaceTrackDisplay } from '@/store/settings.store';
import { PosKeepLabel } from '@/utils/races';

type PosKeepLabelsProps = {
  posKeepLabels: PosKeepLabel[];
};

export const PosKeepLabels = (props: PosKeepLabelsProps) => {
  const { posKeepLabels } = props;

  const { showPosKeepLabels, showVelocityUma1, showVelocityUma2 } = useRaceTrackDisplay();

  if (!posKeepLabels || !showPosKeepLabels) return null;

  return (
    <g id="racetrack-poskeep-labels">
      {posKeepLabels.map((label) => {
        if (label.umaIndex === 0 && !showVelocityUma1) return null;
        if (label.umaIndex === 1 && !showVelocityUma2) return null;
        if (label.x == null || label.width == null || label.yOffset == null) return null;

        return (
          <g key={`${label.umaIndex}-${label.start}-${label.end}`} className="poskeep-label">
            <text
              x={label.x + label.width / 2}
              y={5 + label.yOffset}
              fill={label.color.stroke}
              fontSize="10px"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="hanging"
            >
              {label.text}
            </text>

            <line
              x1={label.x}
              y1={5 + label.yOffset + 12}
              x2={label.x + label.width}
              y2={5 + label.yOffset + 12}
              stroke={label.color.stroke}
              strokeWidth="2"
            />
          </g>
        );
      })}
    </g>
  );
};
