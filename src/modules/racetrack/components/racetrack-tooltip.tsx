export type TooltipData = {
  v1Text: string;
  v2Text: string;
  vpText?: string;
  pd1Text?: string;
  pd2Text?: string;
};

type RaceTrackTooltipProps = {
  data: TooltipData | null;
  className?: string;
  visible: boolean;
  position: {
    xOffset: number;
    yOffset: number;
  };
};

export const RaceTrackTooltip: React.FC<RaceTrackTooltipProps> = (props) => {
  const { data, visible, position } = props;

  const { xOffset, yOffset } = position;

  if (!data || !visible) {
    return null;
  }

  return (
    <g className="font-mono">
      <text x={xOffset + 5} y={yOffset - 25} fill="#2a77c5" fontSize="10px">
        {data.v1Text}
      </text>

      <text x={xOffset + 5} y={yOffset - 10} fill="#c52a2a" fontSize="10px">
        {data.v2Text}
      </text>

      <text x={xOffset + 5} y={yOffset - 10} fill="#22c55e" fontSize="10px">
        {data.vpText}
      </text>

      <text x={xOffset + 5} y={yOffset} fill="#2a77c5" fontSize="10px">
        {data.pd1Text}
      </text>

      <text x={xOffset + 5} y={yOffset + 10} fill="#2a77c5" fontSize="10px">
        {data.pd2Text}
      </text>
    </g>
  );
};
