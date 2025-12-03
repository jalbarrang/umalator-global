type DistanceMarkerProps = {
  x: number;
  y: number;
  d: number;
  up?: boolean;
};

export const DistanceMarker: React.FC<DistanceMarkerProps> = (props) => {
  const { x, y, d, up = false } = props;

  const adjustedY = up ? y - 11.5 : y;

  return (
    <>
      <text
        className="distanceMarker"
        x={`${x}%`}
        y={`${adjustedY - (up ? -0.8 : 0.8)}%`}
        fontSize="10px"
        textAnchor="middle"
        dominantBaseline={up ? 'hanging' : 'auto'}
        fill="rgb(121,64,22)"
      >{`${d}m`}</text>

      <line
        x1={`${x}%`}
        y1={`${adjustedY}%`}
        x2={`${x}%`}
        y2={`${adjustedY + (up ? -2.5 : 2.5)}%`}
        stroke="rgb(121,64,22)"
      />
    </>
  );
};
