import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SkillSimulationData } from '@/modules/simulation/compare.types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

interface ActivationEffectChartProps {
  skillId: string;
  runData: SkillSimulationData;
  courseDistance: number;
  umaIndex?: number;
}

interface BinData {
  start: number;
  end: number;
  maxEffect: number;
  activationCount: number;
}

// Color for beneficial effects
const BENEFICIAL_COLOR = 'var(--chart-4)';

export function ActivationEffectChart({
  skillId,
  runData,
  courseDistance,
  umaIndex = 0,
}: ActivationEffectChartProps) {
  const chartData = useMemo(() => {
    // This chart is currently simplified - in the original it tracks basinn difference at activation
    // For now, we'll show activation positions colored by phase

    const activationData: Array<{ position: number; basinn?: number }> = [];

    // Process all run types
    const runTypes = ['minrun', 'maxrun', 'meanrun', 'medianrun'] as const;

    runTypes.forEach((runType) => {
      const run = runData[runType];
      if (!run || !run.sk) return;

      // From the results data, only use the second value from the sk array (uma2) as the skill is always on uma2
      const skillMap = run.sk[1];

      // Find the activations for the skill
      const activations = skillMap[skillId];

      activations.forEach((activation) => {
        activationData.push({
          position: activation.start,
        });
      });
    });

    if (activationData.length === 0) {
      return { bins: [], hasData: false, phaseStarts: [] };
    }

    // Create bins (10m segments)
    const binSize = 10;
    const maxDistance = Math.ceil(courseDistance / binSize) * binSize;
    const bins: Array<BinData> = [];

    for (let i = 0; i < maxDistance; i += binSize) {
      bins.push({
        start: i,
        end: i + binSize,
        maxEffect: 0,
        activationCount: 0,
      });
    }

    // Count activations per bin
    activationData.forEach(({ position }) => {
      const binIndex = Math.floor(position / binSize);
      if (binIndex >= 0 && binIndex < bins.length) {
        bins[binIndex].activationCount++;
        bins[binIndex].maxEffect = bins[binIndex].activationCount;
      }
    });

    // Get phase boundaries
    const phaseStarts = [
      { position: CourseHelpers.phaseStart(courseDistance, 1), label: 'Mid' },
      { position: CourseHelpers.phaseStart(courseDistance, 2), label: 'Final' },
      { position: CourseHelpers.phaseStart(courseDistance, 3), label: 'Last' },
    ];

    return { bins, hasData: true, phaseStarts };
  }, [skillId, runData, courseDistance, umaIndex]);

  if (!chartData.hasData) {
    return null;
  }

  const maxValue = Math.max(...chartData.bins.map((b) => b.maxEffect), 1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Activation Distribution</h4>
        <span className="text-xs text-muted-foreground">Peak: {maxValue} activations/bin</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData.bins} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="start"
            type="number"
            domain={[0, courseDistance]}
            tickFormatter={(value) => `${value}m`}
            stroke="var(--muted-foreground)"
            fontSize={11}
          />
          <YAxis stroke="var(--muted-foreground)" fontSize={11} width={30} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const data = payload[0].payload as BinData;
              return (
                <div className="bg-popover border rounded-md shadow-md p-2 text-xs">
                  <div className="font-semibold">
                    {data.start}m - {data.end}m
                  </div>
                  <div className="text-muted-foreground">{data.activationCount} activations</div>
                </div>
              );
            }}
          />
          {chartData.phaseStarts.map((phase) => (
            <ReferenceLine
              key={phase.position}
              x={phase.position}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              opacity={0.5}
            />
          ))}
          <Bar dataKey="maxEffect" radius={[2, 2, 0, 0]}>
            {chartData.bins.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.maxEffect > 0 ? BENEFICIAL_COLOR : 'var(--muted)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
