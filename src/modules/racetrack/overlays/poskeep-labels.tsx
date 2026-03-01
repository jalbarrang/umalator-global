import { useRaceTrack } from '../context/RaceTrackContext';

export const PosKeepLabels = () => {
  const { posKeepLabels, showUma1, showUma2 } = useRaceTrack();

  if (!posKeepLabels) return null;

  return (
    <g id="racetrack-poskeep-labels">
      {posKeepLabels.map((label, index) => {
        if (label.umaIndex === 0 && !showUma1) return null;
        if (label.umaIndex === 1 && !showUma2) return null;
        if (label.x == null || label.width == null || label.yOffset == null) return null;

        return (
          <g key={index} className="poskeep-label">
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
