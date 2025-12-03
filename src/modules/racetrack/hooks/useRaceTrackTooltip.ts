import { CourseData } from '@/modules/simulation/lib/CourseData';
import { SimulationRun } from '@/store/race/compare.types';
import { binSearch } from '@/utils/algorithims';

type UseRaceTrackTooltipProps = {
  chartData: SimulationRun;
  course: CourseData;
};

export const useRaceTrackTooltip = (props: UseRaceTrackTooltipProps) => {
  const { chartData, course } = props;

  const rtMouseMove = (pos: number) => {
    if (chartData == null) return;
    document.getElementById('rtMouseOverBox').style.display = 'block';

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

    const v1Text = `${v1.toFixed(2)} m/s  t=${t1.toFixed(2)} s  (${hp1.toFixed(0)} hp remaining)`;
    const v2Text = `${v2.toFixed(2)} m/s  t=${t2.toFixed(2)} s  (${hp2.toFixed(0)} hp remaining)`;

    document.getElementById('rtV1').textContent = v1Text;
    document.getElementById('rtV2').textContent = v2Text;
  };

  const rtMouseLeave = () => {
    document.getElementById('rtMouseOverBox').style.display = 'none';
  };

  return {
    rtMouseMove,
    rtMouseLeave,
  };
};
