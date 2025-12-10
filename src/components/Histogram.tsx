// @ts-expect-error d3 types are not typed
import * as d3 from 'd3'; // Keep for binning logic
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

type HistogramProps = {
  data: number[];
  className?: string;
};

const chartConfig = {
  count: {
    label: 'Count',
    color: '#2a77c5',
  },
} satisfies ChartConfig;

export const Histogram = ({ data }: HistogramProps) => {
  // Calculate domain
  const domain: [number, number] =
    data[0] === 0 && data[data.length - 1] === 0
      ? [-1, 1]
      : [Math.min(0, Math.floor(data[0])), Math.ceil(data[data.length - 1])];

  // Use D3 for binning (recharts doesn't have built-in histogram binning)
  const bucketize = d3
    .bin<number, number>()
    .value((d: number) => d)
    .domain(domain)
    .thresholds(30);

  const buckets = bucketize(data);

  // Transform buckets into recharts-compatible format
  const chartData = buckets.map((bucket: d3.Bin<number, number>) => ({
    range: bucket.x0?.toFixed(1) ?? '',
    count: bucket.length,
    x0: bucket.x0,
    x1: bucket.x1,
  }));

  return (
    <ChartContainer
      config={chartConfig}
      className={'min-h-[100px] max-w-[600px]'}
    >
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="range"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                if (payload?.[0]?.payload) {
                  const { x0, x1 } = payload[0].payload;
                  return `Range: ${x0?.toFixed(2)} – ${x1?.toFixed(2)} lengths`;
                }

                return '';
              }}
            />
          }
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
};
