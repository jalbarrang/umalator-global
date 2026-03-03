// @ts-expect-error d3 types are not typed
import * as d3 from 'd3';
import { memo, useMemo } from 'react';
import { RaceTrackDimensions } from '../types';

const barHeight = RaceTrackDimensions.xAxisHeight;
const barWidth = RaceTrackDimensions.RenderWidth;
const sectionY = RaceTrackDimensions.xAxisY;
const sectionX = RaceTrackDimensions.xOffset;

type XAxisProps = {
  courseDistance: number;
};

export const XAxis = memo<XAxisProps>(function XAxis(props) {
  const { courseDistance } = props;

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, courseDistance]).range([0, barWidth]),
    [courseDistance],
  );

  const ticks = xScale.ticks();
  const [rangeStart, rangeEnd] = xScale.range();

  return (
    <svg
      id="racetrack-x-axis"
      x={sectionX}
      y={sectionY}
      width={barWidth}
      height={barHeight}
      overflow="visible"
    >
      <line x1={rangeStart} x2={rangeEnd} y1={0} y2={0} stroke="var(--color-foreground)" />

      {ticks.map((tick: number) => (
        <g key={tick} transform={`translate(${xScale(tick)},0)`}>
          <line y2={6} stroke="var(--color-foreground)" />
          <text y={15} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">
            {tick}
          </text>
        </g>
      ))}
    </svg>
  );
});
