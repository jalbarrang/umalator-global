// @ts-expect-error d3 types are not typed
import * as d3 from 'd3';
import { memo, useMemo } from 'react';
import { useRaceTrack } from '../context/RaceTrackContext';

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

    return lineGenerator(positions.map((_: number, j: number) => j));
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

export const VelocityPaths = memo(function VelocityPaths() {
  const {
    chartData,
    courseDistance,
    width,
    height,
    showUma1,
    showUma2,
    showHp,
    showLanes,
    course,
  } = useRaceTrack();

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, courseDistance]).range([0, width]),
    [courseDistance, width],
  );

  const yScale = useMemo(() => {
    if (!chartData?.velocity) return null;

    return d3
      .scaleLinear()
      .domain([0, d3.max(chartData.velocity, (v: Array<number>) => d3.max(v)) ?? 0])
      .range([height, 0]);
  }, [chartData, height]);

  const hpYScale = useMemo(() => {
    if (!chartData?.hp) return null;

    return d3
      .scaleLinear()
      .domain([0, d3.max(chartData.hp, (hp: Array<number>) => d3.max(hp)) ?? 0])
      .range([height, 0]);
  }, [chartData, height]);

  const pacemakerYScale = useMemo(() => {
    if (!chartData?.pacerGap) return null;

    const allValues = chartData.pacerGap.flatMap((gap) => gap.filter((d) => d !== undefined));
    if (allValues.length === 0) return null;

    const maxValue = d3.max(allValues) ?? 10;

    return d3
      .scaleLinear()
      .domain([0, Math.max(maxValue, 10)])
      .range([height, height * 0.6]);
  }, [chartData, height]);

  const laneYScale = useMemo(() => {
    if (!chartData?.currentLane || !course.horseLane) return null;

    const gateCount = 9;
    const maxLane = Math.max(gateCount + 1, 11) * course.horseLane;

    return d3
      .scaleLinear()
      .domain([0, maxLane])
      .range([height, height * 0.5]);
  }, [chartData, height, course.horseLane]);

  if (!chartData || !yScale) return null;

  return (
    <g id="racetrack-velocity-paths" transform={`translate(0, 5)`}>
      {chartData.velocity.map((v, i) => {
        if (i === 0 && !showUma1) return null;
        if (i === 1 && !showUma2) return null;

        return (
          <DataPath
            key={`velocity-${i}`}
            positions={chartData.position[i]}
            values={v}
            xScale={xScale}
            yScale={yScale}
            color={colors[i]}
          />
        );
      })}

      {showHp &&
        hpYScale &&
        chartData.hp.map((hp, i) => {
          if (i === 0 && !showUma1) return null;
          if (i === 1 && !showUma2) return null;

          return (
            <DataPath
              key={`hp-${i}`}
              positions={chartData.position[i]}
              values={hp}
              xScale={xScale}
              yScale={hpYScale}
              color={hpColors[i]}
            />
          );
        })}

      {showLanes &&
        laneYScale &&
        chartData.currentLane?.map((lanes, i) => {
          if (i === 0 && !showUma1) return null;
          if (i === 1 && !showUma2) return null;

          return (
            <DataPath
              key={`lane-${i}`}
              positions={chartData.position[i]}
              values={lanes}
              xScale={xScale}
              yScale={laneYScale}
              color={laneColors[i]}
            />
          );
        })}

      {chartData.pacerGap &&
        pacemakerYScale &&
        chartData.pacerGap.map((gap, i) => {
          const validIndices = gap
            .map((g, j) => (g !== undefined && g >= 0 ? j : -1))
            .filter((j) => j >= 0);
          if (validIndices.length === 0) return null;

          if (i === 0 && !showUma1) return null;
          if (i === 1 && !showUma2) return null;

          return (
            <DataPath
              key={`pacer-gap-${i}`}
              positions={validIndices.map((j) => chartData.position[i][j])}
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
  );
});
