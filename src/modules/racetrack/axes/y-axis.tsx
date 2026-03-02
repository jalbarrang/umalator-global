import { SimulationRun } from '@/modules/simulation/compare.types';
// @ts-expect-error d3 types are not typed
import * as d3 from 'd3';
import { memo, useMemo } from 'react';
import { RaceTrackDimensions } from '../types';

type YAxisProps = {
  chartData: SimulationRun;
};

export const YAxis = memo<YAxisProps>(function YAxis(props) {
  const { chartData } = props;

  const yScale = useMemo(() => {
    if (!chartData?.velocity) return null;

    return d3
      .scaleLinear()
      .domain([0, d3.max(chartData.velocity, (v: Array<number>) => d3.max(v)) ?? 30])
      .range([RaceTrackDimensions.yAxisHeight, 0]);
  }, [chartData]);

  if (!yScale) return null;

  const ticks = yScale.ticks();
  const [rangeStart, rangeEnd] = yScale.range();

  return (
    <svg
      id="racetrack-y-axis"
      x={RaceTrackDimensions.xOffset}
      y={RaceTrackDimensions.marginTop}
      width={RaceTrackDimensions.xOffset}
      height={RaceTrackDimensions.yAxisHeight}
      overflow="visible"
    >
      <line x1={0} x2={0} y1={rangeStart} y2={rangeEnd} stroke="currentColor" />

      <g id="racetrack-y-axis-ticks">
        {ticks.map((tick: number) => (
          <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
            <line x2={-3} stroke="currentColor" />

            <text
              x={-6}
              textAnchor="end"
              alignmentBaseline="middle"
              fontSize={10}
              fill="var(--color-foreground)"
            >
              {tick}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
});
