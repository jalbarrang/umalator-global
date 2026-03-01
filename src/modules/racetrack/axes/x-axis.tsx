// @ts-expect-error d3 types are not typed
import * as d3 from 'd3';
import { memo, useMemo } from 'react';
import { useRaceTrack } from '../context/RaceTrackContext';

type XAxisProps = {
  yOffset: number;
  xOffset: number;
};
export const XAxis = memo<XAxisProps>(function XAxis(props) {
  const { yOffset, xOffset } = props;
  const { courseDistance, width } = useRaceTrack();

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, courseDistance]).range([0, width]),
    [courseDistance, width],
  );

  const ticks = xScale.ticks();
  const [rangeStart, rangeEnd] = xScale.range();

  return (
    <svg x={xOffset} y={yOffset} width="100%" height="20">
      <line x1={rangeStart} x2={rangeEnd} y1={0} y2={0} stroke="var(--color-black)" />

      {ticks.map((tick: number) => (
        <g key={tick} transform={`translate(${xScale(tick)},0)`}>
          <line y2={6} stroke="var(--color-black)" />
          <text y={20} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">
            {tick}
          </text>
        </g>
      ))}
    </svg>
  );
});
