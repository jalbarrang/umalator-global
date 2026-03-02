import { useCallback, useImperativeHandle, useRef, useState } from 'react';
import type { Ref } from 'react';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import type { SimulationRun } from '@/modules/simulation/compare.types';
import { binSearch } from '@/utils/algorithims';
import { RaceTrackDimensions } from '../types';

export type TooltipData = {
  v1Text: string;
  v2Text: string;
};

type RaceTrackTooltipProps = {
  chartData: SimulationRun;
  course: CourseData;
  ref?: Ref<RaceTrackTooltipHandle>;
};

export type RaceTrackTooltipHandle = {
  updateFromPositionRatio: (positionRatio: number) => void;
  hide: () => void;
};

export function RaceTrackTooltip(props: RaceTrackTooltipProps) {
  const { chartData, course, ref } = props;
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const lastIndicesRef = useRef<{ i0: number; i1: number } | null>(null);

  const updateFromPositionRatio = useCallback(
    (positionRatio: number) => {
      if (chartData == null) return;

      const x = positionRatio * course.distance;
      const i0 = binSearch(chartData.position[0], x);
      const i1 = binSearch(chartData.position[1], x);
      const safeI0 = Math.max(0, Math.min(i0, chartData.velocity[0].length - 1));
      const safeI1 = Math.max(0, Math.min(i1, chartData.velocity[1].length - 1));
      const t1 = chartData.time[0][safeI0];
      const t2 = chartData.time[1][safeI1];

      if (t1 == null || t2 == null) return;
      setTooltipVisible(true);

      const last = lastIndicesRef.current;
      if (last && last.i0 === safeI0 && last.i1 === safeI1) {
        return;
      }
      lastIndicesRef.current = { i0: safeI0, i1: safeI1 };

      const v1 = chartData.velocity[0][safeI0];
      const hp1 = chartData.hp[0][safeI0];
      const v2 = chartData.velocity[1][safeI1];
      const hp2 = chartData.hp[1][safeI1];
      const v1Text = `${v1.toFixed(2)}m/s t=${t1.toFixed(2)}s (${hp1.toFixed(0)} HP remaining)`;
      const v2Text = `${v2.toFixed(2)}m/s t=${t2.toFixed(2)}s (${hp2.toFixed(0)} HP remaining)`;

      setTooltipData((prev) => {
        if (prev?.v1Text === v1Text && prev.v2Text === v2Text) {
          return prev;
        }
        return { v1Text, v2Text };
      });
    },
    [chartData, course.distance],
  );

  const hide = useCallback(() => {
    setTooltipVisible(false);
    lastIndicesRef.current = null;
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      updateFromPositionRatio,
      hide,
    }),
    [updateFromPositionRatio, hide],
  );

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
}
