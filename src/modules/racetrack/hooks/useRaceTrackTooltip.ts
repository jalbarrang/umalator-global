import { binSearch } from '@/utils/algorithims';

type UseRaceTrackTooltipProps = {
  chartData: any;
  course: any;
};

export const useRaceTrackTooltip = (props: UseRaceTrackTooltipProps) => {
  const { chartData, course } = props;

  const rtMouseMove = (pos: number) => {
    if (chartData == null) return;
    document.getElementById('rtMouseOverBox').style.display = 'block';
    const x = pos * course.distance;
    const i0 = binSearch(chartData.p[0], x),
      i1 = binSearch(chartData.p[1], x);

    // Ensure indices are within bounds
    const safeI0 = Math.max(0, Math.min(i0, chartData.v[0].length - 1));
    const safeI1 = Math.max(0, Math.min(i1, chartData.v[1].length - 1));

    document.getElementById('rtV1').textContent = `${chartData.v[0][
      safeI0
    ].toFixed(2)} m/s  t=${chartData.t[0][safeI0].toFixed(
      2,
    )} s  (${chartData.hp[0][safeI0].toFixed(0)} hp remaining)`;
    document.getElementById('rtV2').textContent = `${chartData.v[1][
      safeI1
    ].toFixed(2)} m/s  t=${chartData.t[1][safeI1].toFixed(
      2,
    )} s  (${chartData.hp[1][safeI1].toFixed(0)} hp remaining)`;
  };

  const rtMouseLeave = () => {
    document.getElementById('rtMouseOverBox').style.display = 'none';
  };

  return {
    rtMouseMove,
    rtMouseLeave,
  };
};
