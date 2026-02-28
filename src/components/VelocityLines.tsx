// @ts-expect-error d3 types are not typed
import * as d3 from 'd3';
import { memo, useMemo } from 'react';
import type { SimulationRun } from '@/modules/simulation/compare.types';
import { useRaceTrackUI } from '@/store/settings.store';

const colors = ['#2a77c5', '#c52a2a'];
const hpColors = ['#688aab', '#ab6868'];
const laneColors = ['#87ceeb', '#ff0000'];

type DataPathProps = {
  positions: Array<number>;
  values: Array<number>;
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  color: string;
  strokeWidth?: number;
  strokeDasharray?: string;
};

const DataPath = memo((props: DataPathProps) => {
  const { positions, values, xScale, yScale, color, strokeWidth = 2.5, strokeDasharray } = props;

  const pathD = useMemo(() => {
    const lineGenerator = d3
      .line<number>()
      .x((j: number) => xScale(positions[j]))
      .y((j: number) => yScale(values[j]));

    return lineGenerator(positions.map((_, j) => j));
  }, [positions, values, xScale, yScale]);

  return (
    <path
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDasharray}
      d={pathD}
    />
  );
});

type XAxisProps = {
  scale: d3.ScaleLinear<number, number>;
  transform: string;
};

const XAxis = memo((props: XAxisProps) => {
  const { scale, transform } = props;

  const ticks = scale.ticks();
  const [rangeStart, rangeEnd] = scale.range();

  return (
    <g transform={transform}>
      <line x1={rangeStart} x2={rangeEnd} y1={0} y2={0} stroke="var(--color-black)" />
      {ticks.map((tick: number) => (
        <g key={tick} transform={`translate(${scale(tick)},0)`}>
          <line y2={6} stroke="var(--color-black)" />
          <text y={20} textAnchor="middle" fontSize={10} fill="var(--color-foreground)">
            {tick}
          </text>
        </g>
      ))}
    </g>
  );
});

type YAxisProps = {
  scale: d3.ScaleLinear<number, number>;
  transform: string;
};

const YAxis = memo((props: YAxisProps) => {
  const { scale, transform } = props;

  const ticks = scale.ticks();
  const [rangeStart, rangeEnd] = scale.range();

  return (
    <g transform={transform}>
      <line x1={0} x2={0} y1={rangeStart} y2={rangeEnd} stroke="currentColor" />

      {ticks.map((tick: number) => (
        <g key={tick} transform={`translate(0,${scale(tick)})`}>
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
    </g>
  );
});

type VelocityLinesProps = {
  data: SimulationRun | null;
  courseDistance: number;
  width?: number;
  height?: number;
  xOffset: number;
  yOffset?: number;
  horseLane: number;
};

const BASE_WIDTH = 960;
const BASE_HEIGHT = 240;
const ASPECT_RATIO = BASE_HEIGHT / BASE_WIDTH;

export const VelocityLines = memo(function VelocityLines(props: VelocityLinesProps) {
  const { data, courseDistance, xOffset, yOffset = 0 } = props;
  const { showUma1, showUma2, showHp, showLanes } = useRaceTrackUI();

  const width = props.width ?? BASE_WIDTH;
  const height = props.height ?? Math.round(width * ASPECT_RATIO);

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, courseDistance]).range([0, width]),
    [courseDistance, width],
  );

  const yScale = useMemo(() => {
    if (!data) return null;
    if (!data.velocity) return null;

    return d3
      .scaleLinear()
      .domain([0, d3.max(data.velocity, (v: Array<number>) => d3.max(v)) ?? 0])
      .range([height, 0]);
  }, [data, height]);

  const hpYScale = useMemo(() => {
    if (!data) return [];
    if (!data.hp) return [];

    return d3
      .scaleLinear()
      .domain([0, d3.max(data.hp, (hp: Array<number>) => d3.max(hp)) ?? 0])
      .range([height, 0]);
  }, [data, height]);

  const pacemakerYScale = useMemo(() => {
    if (!data?.pacerGap) return null;

    const allValues = data.pacerGap.flatMap((gap) => gap.filter((d) => d !== undefined));

    if (allValues.length === 0) return null;

    const maxValue = d3.max(allValues) ?? 10;

    return d3
      .scaleLinear()
      .domain([0, Math.max(maxValue, 10)])
      .range([height, height * 0.6]);
  }, [data, height]);

  const laneYScale = useMemo(() => {
    if (!data?.currentLane || !props.horseLane) return null;

    const gateCount = 9;
    const maxLane = Math.max(gateCount + 1, 11) * props.horseLane;

    return d3
      .scaleLinear()
      .domain([0, maxLane])
      .range([height, height * 0.5]);
  }, [data, height, props.horseLane]);

  // Early return for no data
  if (!data || !yScale) {
    return (
      <>
        <g transform={`translate(${xOffset},${5 + yOffset})`} />

        <XAxis scale={xScale} transform={`translate(${xOffset},${height + 5 + yOffset})`} />
      </>
    );
  }

  return (
    <>
      <g transform={`translate(${xOffset},${5 + yOffset})`}>
        {/* Velocity lines */}
        {data.velocity.map((v, i) => {
          if (i === 0 && !showUma1) return null;
          if (i === 1 && !showUma2) return null;

          return (
            <DataPath
              key={`velocity-${i}`}
              positions={data.position[i]}
              values={v}
              xScale={xScale}
              yScale={yScale}
              color={colors[i]}
            />
          );
        })}

        {/* HP lines */}
        {showHp &&
          hpYScale &&
          data.hp.map((hp, i) => {
            if (i === 0 && !showUma1) return null;
            if (i === 1 && !showUma2) return null;

            return (
              <DataPath
                key={`hp-${i}`}
                positions={data.position[i]}
                values={hp}
                xScale={xScale}
                yScale={hpYScale}
                color={hpColors[i]}
              />
            );
          })}

        {/* Lane lines */}
        {showLanes &&
          laneYScale &&
          data.currentLane?.map((lanes, i) => {
            if (i === 0 && !showUma1) return null;
            if (i === 1 && !showUma2) return null;

            return (
              <DataPath
                key={`lane-${i}`}
                positions={data.position[i]}
                values={lanes}
                xScale={xScale}
                yScale={laneYScale}
                color={laneColors[i]}
              />
            );
          })}

        {/* Pacemaker gap lines (dashed) */}
        {data.pacerGap &&
          pacemakerYScale &&
          data.pacerGap.map((gap, i) => {
            const validIndices = gap
              .map((g, j) => (g !== undefined && g >= 0 ? j : -1))
              .filter((j) => j >= 0);
            if (validIndices.length === 0) return null;

            if (i === 0 && !showUma1) return null;
            if (i === 1 && !showUma2) return null;

            return (
              <DataPath
                key={`pacer-gap-${i}`}
                positions={validIndices.map((j) => data.position[i][j])}
                values={validIndices.map((j) => gap[j])}
                xScale={xScale}
                yScale={pacemakerYScale}
                color={colors[i]}
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            );
          })}
      </g>

      {/* Axes */}
      <XAxis scale={xScale} transform={`translate(${xOffset},${height + 5 + yOffset})`} />
      <YAxis scale={yScale} transform={`translate(${xOffset},${4 + yOffset})`} />
    </>
  );
});
