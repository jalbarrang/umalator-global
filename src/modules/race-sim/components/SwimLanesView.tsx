import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import type { CourseData } from '@/lib/sunday-tools/course/definitions';
import { PHASE_STYLES, RUNNER_COLORS } from '@/modules/race-sim/constants';
import {
  getRunnerPositionsAtTick,
  usePlaybackStore,
} from '@/modules/race-sim/stores/playback.store';
import { useShallow } from 'zustand/shallow';

type SwimLanesViewProps = {
  courseData: CourseData;
  runnerNames?: Record<number, string>;
  trackedRunnerIds?: number[];
  viewStart?: number;
  viewEnd?: number;
  className?: string;
};

type PhaseSegment = {
  label: string;
  start: number;
  end: number;
  fill: string;
  stroke: string;
};

type LaneEntry = {
  runnerId: number;
  name: string;
  rank: number;
  position: number;
  gapFromLeader: number;
  isTracked: boolean;
  color: string;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatGap(distance: number): string {
  if (distance <= 0) {
    return '--';
  }
  return `+${distance.toFixed(1)}m`;
}

function buildPhaseSegments(distance: number): PhaseSegment[] {
  const phase1Start = CourseHelpers.phaseStart(distance, 1);
  const phase2Start = CourseHelpers.phaseStart(distance, 2);
  const phase3Start = CourseHelpers.phaseStart(distance, 3);
  const boundaries = [0, phase1Start, phase2Start, phase3Start, distance];

  return PHASE_STYLES.map((style, i) => ({
    label: style.label,
    start: boundaries[i],
    end: boundaries[i + 1],
    fill: style.fill,
    stroke: style.stroke,
  }));
}

function getTickStep(viewDistance: number): number {
  if (viewDistance <= 300) return 25;
  if (viewDistance <= 600) return 50;
  if (viewDistance <= 1200) return 100;
  if (viewDistance <= 2400) return 200;
  return 400;
}

export const SwimLanesView = memo<SwimLanesViewProps>(function SwimLanesView(props) {
  const {
    courseData,
    runnerNames = {},
    trackedRunnerIds = [],
    viewStart,
    viewEnd,
    className,
  } = props;

  const { results, selectedRound, currentTick } = usePlaybackStore(
    useShallow((s) => ({
      results: s.results,
      selectedRound: s.selectedRound,
      currentTick: s.currentTick,
    })),
  );

  const runnerPositions = useMemo(
    () => getRunnerPositionsAtTick(results, selectedRound, currentTick),
    [results, selectedRound, currentTick],
  );

  const courseDistance = Math.max(courseData.distance, 1);
  const clampedViewStart = clamp(viewStart ?? 0, 0, courseDistance);
  const requestedViewEnd = viewEnd ?? courseDistance;
  const clampedViewEnd = clamp(requestedViewEnd, clampedViewStart + 1, courseDistance);
  const viewDistance = Math.max(clampedViewEnd - clampedViewStart, 1);

  const toPercent = (distance: number): number => {
    const clamped = clamp(distance, clampedViewStart, clampedViewEnd);
    return ((clamped - clampedViewStart) / viewDistance) * 100;
  };

  const phaseSegments = useMemo(() => buildPhaseSegments(courseDistance), [courseDistance]);

  const runnerIds = useMemo(() => {
    const ids = new Set<number>();
    for (const key of Object.keys(runnerNames)) {
      ids.add(Number(key));
    }
    for (const key of Object.keys(runnerPositions)) {
      ids.add(Number(key));
    }
    for (const trackedId of trackedRunnerIds) {
      ids.add(trackedId);
    }
    for (let runnerId = 0; runnerId < 9; runnerId++) {
      ids.add(runnerId);
    }
    return [...ids].sort((left, right) => left - right).slice(0, 9);
  }, [runnerNames, runnerPositions, trackedRunnerIds]);

  const lanes = useMemo(() => {
    const base = runnerIds.map((runnerId) => {
      const position = clamp(
        runnerPositions[runnerId] ?? clampedViewStart,
        clampedViewStart,
        clampedViewEnd,
      );
      return {
        runnerId,
        name: runnerNames[runnerId] ?? `Runner ${runnerId + 1}`,
        position,
        isTracked: trackedRunnerIds.includes(runnerId),
        color: RUNNER_COLORS[runnerId % RUNNER_COLORS.length],
      };
    });

    const leaderDistance = Math.max(...base.map((e) => e.position), clampedViewStart);
    const sorted = [...base].sort((left, right) => right.position - left.position);
    const rankMap = new Map<number, number>();
    for (let i = 0; i < sorted.length; i++) {
      rankMap.set(sorted[i].runnerId, i + 1);
    }

    return base.map(
      (entry): LaneEntry => ({
        ...entry,
        rank: rankMap.get(entry.runnerId) ?? entry.runnerId + 1,
        gapFromLeader: Math.max(0, leaderDistance - entry.position),
      }),
    );
  }, [runnerIds, runnerPositions, clampedViewStart, clampedViewEnd, runnerNames, trackedRunnerIds]);

  const axisTicks = useMemo(() => {
    const step = getTickStep(viewDistance);
    const firstTick = Math.ceil(clampedViewStart / step) * step;
    const ticks = new Set<number>([Math.round(clampedViewStart), Math.round(clampedViewEnd)]);
    for (let tick = firstTick; tick <= clampedViewEnd + 1e-6; tick += step) {
      ticks.add(Math.round(tick));
    }
    return [...ticks].sort((left, right) => left - right);
  }, [clampedViewStart, clampedViewEnd, viewDistance]);

  return (
    <div className={cn('rounded-lg border bg-card p-3', className)}>
      <div className="space-y-2">
        <div className="grid grid-cols-[10.5rem_minmax(0,1fr)_5rem] items-center gap-3 px-1">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Lanes</div>
          <div className="relative h-8 overflow-hidden rounded-md border border-border/80 bg-muted/35">
            {phaseSegments.map((phase) => {
              const clippedStart = clamp(phase.start, clampedViewStart, clampedViewEnd);
              const clippedEnd = clamp(phase.end, clampedViewStart, clampedViewEnd);
              if (clippedEnd <= clippedStart) {
                return null;
              }
              const leftPercent = ((clippedStart - clampedViewStart) / viewDistance) * 100;
              const widthPercent = ((clippedEnd - clippedStart) / viewDistance) * 100;
              return (
                <div
                  key={phase.label}
                  className="absolute bottom-0 top-0 flex items-center justify-center border-r border-border/60 last:border-r-0"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    backgroundColor: phase.fill,
                    boxShadow: `inset 0 1px 0 ${phase.stroke}, inset 0 -1px 0 ${phase.stroke}`,
                  }}
                >
                  {widthPercent > 11 && (
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {phase.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-right text-[10px] uppercase tracking-wide text-muted-foreground">
            Gap
          </div>
        </div>

        {lanes.map((lane) => {
          const markerPercent = toPercent(lane.position);

          return (
            <div
              key={lane.runnerId}
              className="grid grid-cols-[10.5rem_minmax(0,1fr)_5rem] items-center gap-3 px-1"
            >
              <div
                className={cn(
                  'truncate text-sm font-medium',
                  lane.isTracked ? 'text-primary' : 'text-foreground',
                )}
              >
                <span className="mr-2 font-mono text-xs text-muted-foreground">{lane.rank}.</span>
                {lane.name}
              </div>

              <div className="relative h-8 rounded-md border border-border/80 bg-background/80">
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border/80" />
                {phaseSegments.slice(1).map((phase) => {
                  if (phase.start <= clampedViewStart || phase.start >= clampedViewEnd) {
                    return null;
                  }
                  return (
                    <div
                      key={`${lane.runnerId}-separator-${phase.label}`}
                      className="absolute bottom-1 top-1 w-px bg-border/60"
                      style={{ left: `${toPercent(phase.start)}%` }}
                    />
                  );
                })}
                <div
                  className={cn(
                    'absolute top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white',
                    lane.isTracked && 'ring-2 ring-primary/40',
                  )}
                  style={{
                    left: `${markerPercent}%`,
                    backgroundColor: lane.color,
                    boxShadow: lane.isTracked ? `0 0 0 1px ${lane.color}` : undefined,
                  }}
                  aria-label={`${lane.name} at ${lane.position.toFixed(1)} meters`}
                >
                  {lane.runnerId + 1}
                </div>
              </div>

              <div className="text-right font-mono text-xs text-muted-foreground">
                {formatGap(lane.gapFromLeader)}
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-[10.5rem_minmax(0,1fr)_5rem] items-start gap-3 px-1 pt-1">
          <div />
          <div className="relative h-8">
            <div className="absolute left-0 right-0 top-0 h-px bg-border" />
            {axisTicks.map((tick) => {
              const clampedTick = clamp(tick, clampedViewStart, clampedViewEnd);
              return (
                <div
                  key={tick}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${toPercent(clampedTick)}%` }}
                >
                  <div className="h-1.5 w-px bg-border" />
                  <div className="mt-1 whitespace-nowrap text-[10px] text-muted-foreground">
                    {Math.round(clampedTick)}m
                  </div>
                </div>
              );
            })}
          </div>
          <div />
        </div>
      </div>
    </div>
  );
});
