// @ts-expect-error d3 types are not typed
import * as d3 from 'd3';
import { memo, useMemo } from 'react';
import { useRaceTrack } from '../context/RaceTrackContext';

type YAxisProps = {
  xOffset: number;
};

export const YAxis = memo<YAxisProps>(function YAxis(props) {
  const { xOffset } = props;
  const { chartData, height } = useRaceTrack();

  const yScale = useMemo(() => {
    if (!chartData?.velocity) return null;

    return d3
      .scaleLinear()
      .domain([0, d3.max(chartData.velocity, (v: Array<number>) => d3.max(v)) ?? 0])
      .range([height, 0]);
  }, [chartData, height]);

  if (!yScale) return null;

  const ticks = yScale.ticks();
  const [rangeStart, rangeEnd] = yScale.range();

  return (
    <svg x={xOffset} y="0" width="20" height="100%">
      <line x1={0} x2={0} y1={rangeStart} y2={rangeEnd} stroke="currentColor" />

      {ticks.map((tick: number) => (
        <g key={tick} transform={`translate(0, ${yScale(tick)})`}>
          <line x2={-6} stroke="currentColor" />
          <text
            x={-10}
            textAnchor="end"
            alignmentBaseline="middle"
            fontSize={10}
            fill="var(--color-foreground)"
          >
            {tick}
          </text>
        </g>
      ))}
    </svg>
  );
});
