import { RaceTrackDimensions } from '../types';

export type TooltipData = {
  v1Text: string;
  v2Text: string;
  vpText?: string;
  pd1Text?: string;
  pd2Text?: string;
};

type RaceTrackTooltipProps = {
  tooltipData: TooltipData | null;
  tooltipVisible: boolean;
};

export const RaceTrackTooltip = (props: RaceTrackTooltipProps) => {
  const { tooltipData, tooltipVisible } = props;

  if (!tooltipVisible) {
    return null;
  }

  return (
    <svg
      id="racetrack-tooltip"
      className="font-mono"
      x={RaceTrackDimensions.xOffset}
      y={RaceTrackDimensions.marginTop}
      width={RaceTrackDimensions.RenderWidth}
      height={RaceTrackDimensions.yAxisHeight}
      overflow="visible"
    >
      <text x={5} y={0} fill="#2a77c5" fontSize="10px">
        {tooltipData?.v1Text ?? ''}
      </text>
      <text x={5} y={15} fill="#c52a2a" fontSize="10px">
        {tooltipData?.v2Text ?? ''}
      </text>
    </svg>
  );
};
