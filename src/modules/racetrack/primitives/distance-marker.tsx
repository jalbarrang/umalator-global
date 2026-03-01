import { useMemo } from 'react';

type DistanceMarkerProps = {
  x: number;
  y: number;
  d: number;
  up?: boolean;
};

export const DistanceMarker: React.FC<DistanceMarkerProps> = (props) => {
  const { x, y, d, up = false } = props;

  const textYOffset = useMemo(() => {
    return up ? -0.8 : 0.8;
  }, [up]);

  const lineYOffset = useMemo(() => {
    return up ? -2.5 : 2.5;
  }, [up]);

  const yOffset = useMemo(() => {
    return up ? -11.5 : 0;
  }, [y, up]);

  return (
    <>
      <text
        className="distanceMarker"
        x={`${x}%`}
        y={`${y + yOffset + textYOffset}%`}
        fontSize="10px"
        textAnchor="middle"
        dominantBaseline={up ? 'hanging' : 'auto'}
        fill="rgb(121,64,22)"
      >{`${d}m`}</text>

      <line
        x1={`${x}%`}
        y1={`${y + yOffset}%`}
        x2={`${x}%`}
        y2={`${y + yOffset + lineYOffset}%`}
        stroke="rgb(121,64,22)"
      />
    </>
  );
};
