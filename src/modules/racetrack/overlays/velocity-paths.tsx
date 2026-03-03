import { CourseData } from '@/lib/sunday-tools/course/definitions';
import { SimulationRun } from '@/modules/simulation/compare.types';
import { useSettingsStore } from '@/store/settings.store';
// @ts-expect-error d3 types are not typed
import * as d3 from 'd3';
import { memo, useMemo } from 'react';
import { RaceTrackDimensions } from '../types';

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

type VelocityPathsProps = {
  chartData: SimulationRun;
  course: CourseData;
};

const height = RaceTrackDimensions.yAxisHeight;
// const xOffset = RaceTrackDimensions.xOffset;

export const VelocityPaths = memo<VelocityPathsProps>(function VelocityPaths(props) {
  const { chartData, course } = props;

  const { showHp, showLanes, showUma1, showUma2 } = useSettingsStore();

  const xScale = useMemo(
    () => d3.scaleLinear().domain([0, course.distance]).range([0, RaceTrackDimensions.RenderWidth]),
    [course.distance],
  );

  const yScale = useMemo(() => {
    if (!chartData?.velocity) return null;

    return d3
      .scaleLinear()
      .domain([0, d3.max(chartData.velocity, (v: Array<number>) => d3.max(v)) ?? 0])
      .range([height, 0]);
  }, [chartData]);

  const hpYScale = useMemo(() => {
    if (!chartData?.hp) return null;

    return d3
      .scaleLinear()
      .domain([0, d3.max(chartData.hp, (hp: Array<number>) => d3.max(hp)) ?? 0])
      .range([height, 0]);
  }, [chartData]);

  const laneYScale = useMemo(() => {
    if (!chartData?.currentLane || !course.horseLane) return null;

    const gateCount = 9;
    const maxLane = Math.max(gateCount + 1, 11) * course.horseLane;

    return d3
      .scaleLinear()
      .domain([0, maxLane])
      .range([height, height * 0.5]);
  }, [chartData, course.horseLane]);

  if (!chartData || !yScale) return null;

  return (
    <svg
      id="racetrack-velocity-paths"
      x={RaceTrackDimensions.xOffset}
      y={RaceTrackDimensions.marginTop}
      height={height}
      width={RaceTrackDimensions.RenderWidth}
    >
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
    </svg>
  );
});
