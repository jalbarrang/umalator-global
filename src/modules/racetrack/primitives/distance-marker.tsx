import { useMemo } from 'react';

type DistanceMarkerProps = {
  x: number;
  y: number;
  d: number;
  up?: boolean;
};

export const DistanceMarker: React.FC<DistanceMarkerProps> = (props) => {
  const { x, y, d, up = false } = props;

  const textY = useMemo(() => {
    if (up) {
      return y - y + 10;
    }

    return y - 10;
  }, [y, up]);

  const lineY = useMemo(() => {
    if (up) {
      const baseY = y - y;
      return {
        start: baseY - 2,
        end: baseY + 8,
      };
    }

    return {
      start: y - 8,
      end: y,
    };
  }, [y, up]);

  return (
    <>
      <text
        className="distanceMarker"
        x={`${x}%`}
        y={`${textY}`}
        fontSize="8px"
        textAnchor="middle"
        dominantBaseline={up ? 'hanging' : 'auto'}
        fill="rgb(121,64,22)"
      >{`${d}m`}</text>

      <line
        x1={`${x}%`}
        y1={`${lineY.start}`}
        x2={`${x}%`}
        y2={`${lineY.end}`}
        stroke="rgb(121,64,22)"
      />
    </>
  );
};
