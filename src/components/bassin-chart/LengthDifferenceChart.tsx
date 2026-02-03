import { useMemo } from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  BarChart as RechartsBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DEFAULT_BIN_SIZE,
  PHASE_COLORS,
  createDistanceBins,
  getPhaseForPosition,
  getPhaseReferenceLines,
} from './utils';
import type { SkillTrackedMetaCollection } from '@/modules/simulation/compare.types';

interface LengthDifferenceChartProps {
  skillId: string;
  skillActivations: Record<string, SkillTrackedMetaCollection>;
  courseDistance: number;
}

interface BinData {
  start: number;
  end: number;
  maxBasinn: number;
  phase: number;
}

export function LengthDifferenceChart({
  skillId,
  skillActivations,
  courseDistance,
}: LengthDifferenceChartProps) {
  const chartData = useMemo(() => {
    const activations = skillActivations[skillId];

    if (!activations || activations.length === 0) {
      return { bins: [], hasData: false, maxValue: 0, phaseStarts: [] };
    }

    // Filter for beneficial activations (positive basinn)
    const beneficialActivations = activations.filter((act) => act.horseLength > 0);

    if (beneficialActivations.length === 0) {
      return { bins: [], hasData: false, maxValue: 0, phaseStarts: [] };
    }

    // Create bins using shared utility
    const bins = createDistanceBins(courseDistance, DEFAULT_BIN_SIZE, (start, end) => ({
      start,
      end,
      maxBasinn: 0,
      phase: getPhaseForPosition(start, courseDistance),
    }));

    // Find max basinn per bin
    beneficialActivations.forEach(({ positions, horseLength }) => {
      for (const position of positions) {
        const binIndex = Math.floor(position / DEFAULT_BIN_SIZE);
        if (binIndex >= 0 && binIndex < bins.length) {
          bins[binIndex].maxBasinn = Math.max(bins[binIndex].maxBasinn, Math.abs(horseLength));
        }
      }
    });

    const maxValue = Math.max(...bins.map((b) => b.maxBasinn), 0);
    const phaseStarts = getPhaseReferenceLines(courseDistance);

    return {
      bins,
      hasData: maxValue > 0,
      maxValue,
      phaseStarts,
    };
  }, [skillId, skillActivations, courseDistance]);

  if (!chartData.hasData) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Length Difference Impact</h4>
        <span className="text-xs text-muted-foreground">Max: {chartData.maxValue.toFixed(2)}L</span>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <RechartsBarChart data={chartData.bins} margin={{ top: 10, right: 5, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="start"
            type="number"
            domain={[0, courseDistance]}
            tickFormatter={(value) => `${value}m`}
            stroke="var(--muted-foreground)"
            fontSize={11}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            width={35}
            tickFormatter={(value) => `${value.toFixed(1)}L`}
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
                    Max Impact: {data.maxBasinn.toFixed(2)}L
                  </div>
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
          <Bar dataKey="maxBasinn" radius={[2, 2, 0, 0]}>
            {chartData.bins.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.maxBasinn > 0 ? PHASE_COLORS[entry.phase] : 'var(--muted)'}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>

      <div className="text-xs text-muted-foreground">
        Shows the maximum positive impact (in lengths) this skill had when activated at different
        points along the course.
      </div>
    </div>
  );
}
