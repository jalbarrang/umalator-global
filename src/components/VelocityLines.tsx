import { SimulationRun } from '@/store/race/compare.types';
import * as d3 from 'd3';
import { memo, useMemo } from 'react';

const colors = ['#2a77c5', '#c52a2a'];
const hpColors = ['#688aab', '#ab6868'];
const laneColors = ['#87ceeb', '#ff0000'];
const pacemakerColors = ['#22c55e', '#a855f7', '#ec4899'];

type DataPathProps = {
  positions: number[];
  values: number[];
  xScale: d3.ScaleLinear<number, number>;
  yScale: d3.ScaleLinear<number, number>;
  color: string;
  strokeWidth?: number;
  strokeDasharray?: string;
};

const DataPath = memo((props: DataPathProps) => {
  const {
    positions,
    values,
    xScale,
    yScale,
    color,
    strokeWidth = 2.5,
    strokeDasharray,
  } = props;

  const pathD = useMemo(() => {
    const lineGenerator = d3
      .line<number>()
      .x((j) => xScale(positions[j]))
      .y((j) => yScale(values[j]));

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
      <line
        x1={rangeStart}
        x2={rangeEnd}
        y1={0}
        y2={0}
        stroke="var(--color-black)"
      />
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(${scale(tick)},0)`}>
          <line y2={6} stroke="var(--color-black)" />
          <text
            y={20}
            textAnchor="middle"
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
      {ticks.map((tick) => (
        <g key={tick} transform={`translate(0,${scale(tick)})`}>
          <line x2={-6} stroke="currentColor" />
          <text
            x={-10}
            textAnchor="end"
            alignmentBaseline="middle"
            fontSize={10}
          >
            {tick}
          </text>
        </g>
      ))}
    </g>
  );
});

type VelocityLinesProps = {
  data: SimulationRun;
  courseDistance: number;
  width?: number;
  height?: number;
  xOffset: number;
  showHp: boolean;
  showLanes: boolean;
  horseLane: number;
  showVirtualPacemaker: boolean;
  selectedPacemakers: boolean[];
};

const BASE_WIDTH = 960;
const BASE_HEIGHT = 240;
const ASPECT_RATIO = BASE_HEIGHT / BASE_WIDTH;

export const VelocityLines = memo(function VelocityLines(
  props: VelocityLinesProps,
) {
  const { data, courseDistance, xOffset } = props;

  const width = props.width ?? BASE_WIDTH;
  const height = props.height ?? Math.round(width * ASPECT_RATIO);

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, courseDistance]).range([0, width]),
    [courseDistance, width],
  );

  const yScale = useMemo(() => {
    if (!data) return null;
    if (!data.v) return null;

    return d3
      .scaleLinear()
      .domain([0, d3.max(data.v, (v) => d3.max(v)) ?? 0])
      .range([height, 0]);
  }, [data, height]);

  const hpYScale = useMemo(() => {
    if (!data) return [];
    if (!data.hp) return [];

    return d3
      .scaleLinear()
      .domain([0, d3.max(data.hp, (hp) => d3.max(hp)) ?? 0])
      .range([height, 0]);
  }, [data, height]);

  const pacemakerYScale = useMemo(() => {
    if (!data?.pacerGap) return null;
    const allValues = data.pacerGap.flatMap((gap) =>
      gap.filter((d) => d !== undefined),
    );
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
  }, [data, height, props.horseLane]); // ✅ Fixed dependencies

  // Early return for no data
  if (!data || !yScale) {
    return (
      <>
        <g transform={`translate(${xOffset},5)`} />
        <XAxis
          scale={xScale}
          transform={`translate(${xOffset},${height + 5})`}
        />
      </>
    );
  }

  return (
    <>
      <g transform={`translate(${xOffset},5)`}>
        {/* Velocity lines */}
        {data.v.map((v, i) => (
          <DataPath
            key={`velocity-${i}`}
            positions={data.p[i]}
            values={v}
            xScale={xScale}
            yScale={yScale}
            color={colors[i]}
          />
        ))}

        {/* HP lines */}
        {props.showHp &&
          hpYScale &&
          data.hp.map((hp, i) => (
            <DataPath
              key={`hp-${i}`}
              positions={data.p[i]}
              values={hp}
              xScale={xScale}
              yScale={hpYScale}
              color={hpColors[i]}
            />
          ))}

        {/* Lane lines */}
        {props.showLanes &&
          laneYScale &&
          data.currentLane?.map((lanes, i) => (
            <DataPath
              key={`lane-${i}`}
              positions={data.p[i]}
              values={lanes}
              xScale={xScale}
              yScale={laneYScale}
              color={laneColors[i]}
            />
          ))}

        {/* Pacemaker gap lines (dashed) */}
        {data.pacerGap &&
          pacemakerYScale &&
          data.pacerGap.map((gap, i) => {
            const validIndices = gap
              .map((g, j) => (g !== undefined && g >= 0 ? j : -1))
              .filter((j) => j >= 0);
            if (validIndices.length === 0) return null;

            return (
              <DataPath
                key={`pacer-gap-${i}`}
                positions={validIndices.map((j) => data.p[i][j])}
                values={validIndices.map((j) => gap[j])}
                xScale={xScale}
                yScale={pacemakerYScale}
                color={colors[i]}
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            );
          })}

        {/* Virtual pacemaker lines */}
        {props.showVirtualPacemaker && data.pacerV && data.pacerP && (
          <>
            {[0, 1, 2].map((pacemakerIndex) => {
              if (!props.selectedPacemakers?.[pacemakerIndex]) return null;
              const pacerV = data.pacerV?.[pacemakerIndex];
              const pacerP = data.pacerP?.[pacemakerIndex];
              if (!pacerV || !pacerP) return null;

              const validIndices = pacerP
                .map((pos, j) =>
                  pos !== undefined && pacerV[j] !== undefined ? j : -1,
                )
                .filter((j) => j >= 0);
              if (validIndices.length === 0) return null;

              return (
                <DataPath
                  key={`vp-${pacemakerIndex}`}
                  positions={validIndices.map((j) => pacerP[j])}
                  values={validIndices.map((j) => pacerV[j])}
                  xScale={xScale}
                  yScale={yScale}
                  color={pacemakerColors[pacemakerIndex]}
                />
              );
            })}
          </>
        )}
      </g>

      {/* Axes */}
      <XAxis scale={xScale} transform={`translate(${xOffset},${height + 5})`} />
      <YAxis scale={yScale} transform={`translate(${xOffset},4)`} />
    </>
  );
});
