import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSkillNameById } from '@/modules/skills/utils';
import { getUmaDisplayInfo } from '@/modules/runners/utils';
import { cn } from '@/lib/utils';
import { useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import type { CollectedRunnerRoundData } from '@/lib/sunday-tools/common/race-observer';

type FocusRunnerDetailPanelProps = {
  runnerIndex: number;
};

type RoundFocusData = {
  sampleIndex: number;
  seed: number;
  data: CollectedRunnerRoundData;
};

type LineChartProps = {
  title: string;
  xValues: number[];
  yValues: number[];
  color: string;
  yUnit: string;
};

function toChartPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) {
    return '';
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function MiniLineChart({ title, xValues, yValues, color, yUnit }: LineChartProps) {
  const width = 720;
  const height = 190;
  const leftPadding = 44;
  const rightPadding = 16;
  const topPadding = 16;
  const bottomPadding = 28;

  const points = useMemo(() => {
    const length = Math.min(xValues.length, yValues.length);
    if (length < 2) {
      return [];
    }

    const xSlice = xValues.slice(0, length);
    const ySlice = yValues.slice(0, length);
    const xMin = Math.min(...xSlice);
    const xMax = Math.max(...xSlice);
    const yMinRaw = Math.min(...ySlice);
    const yMaxRaw = Math.max(...ySlice);
    const yRange = Math.max(yMaxRaw - yMinRaw, 1e-6);

    return ySlice.map((value, index) => {
      const x = xSlice[index];
      const scaledX =
        leftPadding +
        ((x - xMin) / Math.max(xMax - xMin, 1e-6)) * (width - leftPadding - rightPadding);
      const scaledY =
        topPadding + ((yMaxRaw - value) / yRange) * (height - topPadding - bottomPadding);

      return { x: scaledX, y: scaledY };
    });
  }, [xValues, yValues]);

  const yMin = yValues.length > 0 ? Math.min(...yValues) : 0;
  const yMax = yValues.length > 0 ? Math.max(...yValues) : 0;
  const xMax = xValues.length > 0 ? Math.max(...xValues) : 0;

  return (
    <Card size="sm" className="min-w-0">
      <CardHeader className="border-b">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3">
        {points.length < 2 ? (
          <div className="text-sm text-muted-foreground">Not enough data for chart.</div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
            <line
              x1={leftPadding}
              y1={height - bottomPadding}
              x2={width - rightPadding}
              y2={height - bottomPadding}
              className="stroke-border"
            />
            <line
              x1={leftPadding}
              y1={topPadding}
              x2={leftPadding}
              y2={height - bottomPadding}
              className="stroke-border"
            />

            {Array.from({ length: 4 }, (_, index) => {
              const y = topPadding + ((height - topPadding - bottomPadding) * (index + 1)) / 4;
              return (
                <line
                  key={`grid-${index}`}
                  x1={leftPadding}
                  x2={width - rightPadding}
                  y1={y}
                  y2={y}
                  className="stroke-border/60"
                  strokeDasharray="3 4"
                />
              );
            })}

            <path d={toChartPath(points)} fill="none" stroke={color} strokeWidth={2.2} />

            <text
              x={leftPadding}
              y={height - 6}
              className="fill-muted-foreground text-[10px]"
              textAnchor="start"
            >
              0m
            </text>
            <text
              x={width - rightPadding}
              y={height - 6}
              className="fill-muted-foreground text-[10px]"
              textAnchor="end"
            >
              {xMax.toFixed(0)}m
            </text>
            <text
              x={leftPadding - 6}
              y={topPadding + 8}
              className="fill-muted-foreground text-[10px]"
              textAnchor="end"
            >
              {yMax.toFixed(2)}
              {yUnit}
            </text>
            <text
              x={leftPadding - 6}
              y={height - bottomPadding}
              className="fill-muted-foreground text-[10px]"
              textAnchor="end"
            >
              {yMin.toFixed(2)}
              {yUnit}
            </text>
          </svg>
        )}
      </CardContent>
    </Card>
  );
}

export function FocusRunnerDetailPanel({ runnerIndex }: FocusRunnerDetailPanelProps) {
  const { results, runners } = useRaceSimStore(
    useShallow((state) => ({
      results: state.results,
      runners: state.runners,
    })),
  );

  const focusedRounds = useMemo<Array<RoundFocusData>>(() => {
    if (!results?.collectedData?.rounds) {
      return [];
    }

    const collected: Array<RoundFocusData> = [];
    for (const [sampleIndex, round] of results.collectedData.rounds.entries()) {
      const data = round.focusRunnerData[runnerIndex];
      if (!data) {
        continue;
      }
      collected.push({
        sampleIndex,
        seed: round.seed,
        data,
      });
    }

    return collected;
  }, [results, runnerIndex]);

  const [selectedSample, setSelectedSample] = useState('0');

  useEffect(() => {
    setSelectedSample('0');
  }, [runnerIndex]);

  const selectedData = focusedRounds[Number(selectedSample)] ?? null;
  const skillRows = useMemo(() => {
    if (!selectedData) {
      return [];
    }

    const rows = Object.entries(selectedData.data.skillActivations)
      .map(([skillId, logs]) => ({
        skillId,
        name: (() => {
          try {
            return getSkillNameById(skillId);
          } catch {
            return skillId;
          }
        })(),
        logs: logs
          .map((log) => ({
            start: log.start,
            end: Math.max(log.end, log.start),
          }))
          .toSorted((a, b) => a.start - b.start),
      }))
      .filter((entry) => entry.logs.length > 0)
      .toSorted((a, b) => {
        const startA = a.logs[0]?.start ?? Number.MAX_SAFE_INTEGER;
        const startB = b.logs[0]?.start ?? Number.MAX_SAFE_INTEGER;
        return startA - startB;
      });

    return rows;
  }, [selectedData]);

  if (!selectedData) {
    return null;
  }

  const runner = runners[runnerIndex];
  const displayInfo = runner?.outfitId ? getUmaDisplayInfo(runner.outfitId) : null;
  const runnerName = displayInfo?.name ?? `Runner ${runnerIndex + 1}`;

  const distanceMax = Math.max(
    selectedData.data.finishPosition,
    selectedData.data.position[selectedData.data.position.length - 1] ?? 0,
  );

  return (
    <Card className="min-w-0">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Focus Runner Detail - Gate {runnerIndex + 1}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{runnerName}</span>
            {focusedRounds.length > 1 && (
              <Select
                value={selectedSample}
                onValueChange={(value) => setSelectedSample(value ?? '0')}
              >
                <SelectTrigger className="w-[168px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {focusedRounds.map((round, index) => (
                    <SelectItem key={`${round.seed}-${index}`} value={index.toString()}>
                      Sample {round.sampleIndex + 1} (Seed {round.seed})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid min-w-0 gap-3 pt-3">
        <MiniLineChart
          title="Velocity over Distance"
          xValues={selectedData.data.position}
          yValues={selectedData.data.velocity}
          color="hsl(var(--primary))"
          yUnit="m/s"
        />
        <MiniLineChart
          title="HP over Distance"
          xValues={selectedData.data.position}
          yValues={selectedData.data.hp}
          color="hsl(var(--chart-4))"
          yUnit=""
        />

        <Card size="sm">
          <CardHeader className="border-b">
            <CardTitle className="text-sm">Skill Activation Timeline</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            {skillRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No skill activations captured for this sample.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {skillRows.map((row) => (
                  <div
                    key={row.skillId}
                    className="grid grid-cols-[180px_minmax(0,1fr)] items-center gap-2"
                  >
                    <div className="truncate text-xs font-medium" title={row.name}>
                      {row.name}
                    </div>
                    <div className="relative h-5 rounded bg-muted/70">
                      {row.logs.map((log, index) => {
                        const leftPct = (log.start / Math.max(distanceMax, 1)) * 100;
                        const widthPct = Math.max(
                          ((log.end - log.start) / Math.max(distanceMax, 1)) * 100,
                          1.2,
                        );

                        return (
                          <span
                            key={`${row.skillId}-${index}`}
                            className={cn(
                              'absolute top-0.5 h-4 rounded bg-primary/70',
                              'ring-1 ring-primary/40',
                            )}
                            style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                            title={`${row.name}: ${log.start.toFixed(0)}m -> ${log.end.toFixed(0)}m`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}
