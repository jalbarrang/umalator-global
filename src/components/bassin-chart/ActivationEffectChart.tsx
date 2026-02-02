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
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

interface ActivationEffectChartProps {
  skillId: string;
  skillActivations: Record<string, Array<{ position: number }>>;
  courseDistance: number;
}

interface BinData {
  start: number;
  end: number;
  maxEffect: number;
  activationCount: number;
  phase: number;
}

// Phase colors matching the RaceTrack visualization
const PHASE_COLORS = [
  'rgb(0,154,111)', // Early race (green)
  'rgb(242,233,103)', // Mid race (yellow)
  'rgb(209,134,175)', // Late race (light pink)
  'rgb(255,130,130)', // Last spurt (light red)
];

// Helper function to determine which phase a position belongs to
const getPhaseForPosition = (position: number, courseDistance: number): number => {
  const phase1Start = CourseHelpers.phaseStart(courseDistance, 1);
  const phase2Start = CourseHelpers.phaseStart(courseDistance, 2);
  const phase3Start = CourseHelpers.phaseStart(courseDistance, 3);

  if (position < phase1Start) return 0;
  if (position < phase2Start) return 1;
  if (position < phase3Start) return 2;
  return 3;
};

export function ActivationEffectChart({
  skillId,
  skillActivations,
  courseDistance,
}: ActivationEffectChartProps) {
  const chartData = useMemo(() => {
    // Get all activations for this skill across all simulation runs
    const activations = skillActivations[skillId];

    if (!activations || activations.length === 0) {
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
        phase: getPhaseForPosition(i, courseDistance),
      });
    }

    // Count activations per bin from all accumulated activations
    activations.forEach(({ position }) => {
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
  }, [skillId, skillActivations, courseDistance]);

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
                fill={entry.maxEffect > 0 ? PHASE_COLORS[entry.phase] : 'var(--muted)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
