import { useRaceTrack } from '../context/RaceTrackContext';

export type TooltipData = {
  v1Text: string;
  v2Text: string;
  vpText?: string;
  pd1Text?: string;
  pd2Text?: string;
};

export const RaceTrackTooltip = () => {
  const { tooltipData, tooltipVisible } = useRaceTrack();

  if (!tooltipData || !tooltipVisible) {
    return null;
  }

  return (
    <g id="racetrack-tooltip" className="font-mono">
      <text x={5} y={-25} fill="#2a77c5" fontSize="10px">
        {tooltipData.v1Text}
      </text>
      <text x={5} y={-10} fill="#c52a2a" fontSize="10px">
        {tooltipData.v2Text}
      </text>
      <text x={5} y={-10} fill="#22c55e" fontSize="10px">
        {tooltipData.vpText}
      </text>
      <text x={5} y={0} fill="#2a77c5" fontSize="10px">
        {tooltipData.pd1Text}
      </text>
      <text x={5} y={10} fill="#2a77c5" fontSize="10px">
        {tooltipData.pd2Text}
      </text>
    </g>
  );
};
