import { RaceTrackDimensions } from '../types';

type MouseLineProps = {
  mouseLineRef: React.RefObject<SVGLineElement | null>;
  mouseTextRef: React.RefObject<SVGTextElement | null>;
};

export const MouseLine = (props: MouseLineProps) => {
  const { mouseLineRef, mouseTextRef } = props;

  return (
    <svg id="racetrack-mouse-line" x={RaceTrackDimensions.xOffset} y="0" width="100%" height="100%">
      <line
        ref={mouseLineRef}
        className="mouseoverLine"
        x1="-5"
        y1="0"
        x2="-5"
        y2="100%"
        stroke="rgb(121,64,22)"
        strokeWidth="2"
        pointerEvents="none"
      />
      <text
        ref={mouseTextRef}
        className="mouseoverText"
        x="-5"
        y="-5"
        fill="rgb(121,64,22)"
        pointerEvents="none"
      />
    </svg>
  );
};
