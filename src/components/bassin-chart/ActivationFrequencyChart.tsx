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
import type { SkillActivation, SkillSimulationData } from '@/modules/simulation/compare.types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

interface ActivationFrequencyChartProps {
  skillId: string;
  runData: SkillSimulationData;
  courseDistance: number;
  umaIndex?: number;
}

interface BinData {
  start: number;
  end: number;
  count: number;
  percentage: number;
}

// Color scheme for race phases
const PHASE_COLORS = {
  phase0: 'hsl(var(--chart-1))', // Start phase
  phase1: 'hsl(var(--chart-2))', // Middle phase
  phase2: 'hsl(var(--chart-3))', // Final phase
};

export function ActivationFrequencyChart({
  skillId,
  runData,
  courseDistance,
  umaIndex = 0,
}: ActivationFrequencyChartProps) {
  const chartData = useMemo(() => {
    // Collect all activation positions for this skill across all run types
    const activationPositions: Array<number> = [];

    // Process all run types (minrun, maxrun, meanrun, medianrun)
    const runTypes = ['minrun', 'maxrun', 'meanrun', 'medianrun'] as const;

    runTypes.forEach((runType) => {
      const run = runData[runType];
      if (!run || !run.sk) return;

      // Check BOTH uma indices since the skill could be on either runner
      // In Basinn simulations, we're comparing WITH skill vs WITHOUT
      for (let i = 0; i < 2; i++) {
        const skillMap = run.sk[i];
        if (!skillMap) continue;

        const activations = skillMap[skillId];
        if (!activations) continue;

        activations.forEach((activation: SkillActivation) => {
          activationPositions.push(activation.start);
        });
      }
    });

    if (activationPositions.length === 0) {
      return { bins: [], totalActivations: 0, phaseStarts: [] };
    }

    // Create bins for the histogram (10m segments)
    const binSize = 10;
    const maxDistance = Math.ceil(courseDistance / binSize) * binSize;
    const bins: Array<BinData> = [];

    for (let i = 0; i < maxDistance; i += binSize) {
      bins.push({
        start: i,
        end: i + binSize,
        count: 0,
        percentage: 0,
      });
    }

    // Fill bins with activation counts
    activationPositions.forEach((pos) => {
      const binIndex = Math.floor(pos / binSize);
      if (binIndex >= 0 && binIndex < bins.length) {
        bins[binIndex].count++;
      }
    });

    // Calculate percentages
    const totalActivations = activationPositions.length;
    bins.forEach((bin) => {
      bin.percentage = totalActivations > 0 ? (bin.count / totalActivations) * 100 : 0;
    });

    // Get phase boundaries
    const phaseStarts = [
      { position: CourseHelpers.phaseStart(courseDistance, 1), label: 'Mid' },
      { position: CourseHelpers.phaseStart(courseDistance, 2), label: 'Final' },
      { position: CourseHelpers.phaseStart(courseDistance, 3), label: 'Last' },
    ];

    return { bins, totalActivations, phaseStarts };
  }, [skillId, runData, courseDistance, umaIndex]);

  if (chartData.totalActivations === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
        No activation data available for this skill
      </div>
    );
  }

  const getBarColor = (binStart: number) => {
    const phase1 = CourseHelpers.phaseStart(courseDistance, 1);
    const phase2 = CourseHelpers.phaseStart(courseDistance, 2);

    if (binStart < phase1) return PHASE_COLORS.phase0;
    if (binStart < phase2) return PHASE_COLORS.phase1;
    return PHASE_COLORS.phase2;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Activation Frequency</h4>
        <span className="text-xs text-muted-foreground">
          {chartData.totalActivations} total activations
        </span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData.bins} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="start"
            type="number"
            domain={[0, courseDistance]}
            tickFormatter={(value) => `${value}m`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
          />
          <YAxis
            tickFormatter={(value) => `${Math.round(value)}%`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={11}
            width={35}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const data = payload[0].payload as BinData;
              return (
                <div className="bg-popover border rounded-md shadow-md p-2 text-xs">
                  <div className="font-semibold">
                    {data.start}m - {data.end}m
                  </div>
                  <div className="text-muted-foreground">
                    {data.count} activations ({data.percentage.toFixed(1)}%)
                  </div>
                </div>
              );
            }}
          />
          {chartData.phaseStarts.map((phase) => (
            <ReferenceLine
              key={phase.position}
              x={phase.position}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="3 3"
              opacity={0.5}
            />
          ))}
          <Bar dataKey="percentage" radius={[2, 2, 0, 0]}>
            {chartData.bins.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.start)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: PHASE_COLORS.phase0 }} />
          <span className="text-muted-foreground">Start</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: PHASE_COLORS.phase1 }} />
          <span className="text-muted-foreground">Middle</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: PHASE_COLORS.phase2 }} />
          <span className="text-muted-foreground">Final</span>
        </div>
      </div>
    </div>
  );
}
