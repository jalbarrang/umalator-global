import { useState } from 'react';
import { CourseData } from '@/modules/simulation/lib/CourseData';
import { SimulationRun } from '@/store/race/compare.types';
import { binSearch } from '@/utils/algorithims';
import { TooltipData } from '@/modules/racetrack/components/racetrack-tooltip';

type UseRaceTrackTooltipProps = {
  chartData: SimulationRun;
  course: CourseData;
};

export const useRaceTrackTooltip = (props: UseRaceTrackTooltipProps) => {
  const { chartData, course } = props;

  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const rtMouseMove = (pos: number) => {
    if (chartData == null) return;

    setTooltipVisible(true);

    const x = pos * course.distance;

    const i0 = binSearch(chartData.p[0], x);
    const i1 = binSearch(chartData.p[1], x);

    // Ensure indices are within bounds
    const safeI0 = Math.max(0, Math.min(i0, chartData.v[0].length - 1));
    const safeI1 = Math.max(0, Math.min(i1, chartData.v[1].length - 1));

    const v1 = chartData.v[0][safeI0];
    const t1 = chartData.t[0][safeI0];
    const hp1 = chartData.hp[0][safeI0];

    const v2 = chartData.v[1][safeI1];
    const t2 = chartData.t[1][safeI1];
    const hp2 = chartData.hp[1][safeI1];

    const v1Text = `${v1.toFixed(2)}m/s t=${t1.toFixed(2)}s (${hp1.toFixed(0)} HP remaining)`;
    const v2Text = `${v2.toFixed(2)}m/s t=${t2.toFixed(2)}s (${hp2.toFixed(0)} HP remaining)`;

    setTooltipData({
      v1Text,
      v2Text,
      // Reserve for future use
      vpText: undefined,
      pd1Text: undefined,
      pd2Text: undefined,
    });
  };

  const rtMouseLeave = () => {
    setTooltipVisible(false);
  };

  return {
    tooltipData,
    tooltipVisible,
    rtMouseMove,
    rtMouseLeave,
  };
};
